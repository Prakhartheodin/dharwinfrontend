"use client"

import Pageheader from "@/shared/layout-components/page-header/pageheader"
import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useState, useEffect } from "react"
import Link from "next/link"
import type { Course } from "@/shared/data/training/courses-data"
import { listTrainingModules, type TrainingModule } from "@/shared/lib/api/training-modules"
import CourseCatalogToolbar from "@/shared/components/course-catalog-toolbar"
import type { CourseCatalogSortBy } from "@/shared/components/course-catalog-sort-dropdown"

/**
 * A module assigned to N categories renders under EVERY category — not only
 * `categories[0]`. The category filter buckets are keyed by category id so two
 * users with the same role-assigned modules always see the same counts.
 */
type CategoryRef = { id: string; name: string }

interface CurriculumCourse extends Course {
  categories: CategoryRef[]
  createdAt: string
}

function mapModuleToCourse(m: TrainingModule): CurriculumCourse {
  const mentorName = m.mentorsAssigned?.[0]?.user?.name ?? "Instructor"
  const categories: CategoryRef[] = (m.categories ?? []).map((c) => ({ id: c.id, name: c.name }))
  return {
    id: m.id,
    title: m.moduleName,
    instructor: mentorName,
    thumbnail: m.coverImage?.url ?? "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=220&fit=crop",
    progress: 0,
    description: m.shortDescription || "",
    lessons: (m.playlist ?? []).map((item, idx) => ({
      id: item.id ?? item._id ?? `pl-${idx}`,
      title: item.title,
      duration: item.duration ? `${item.duration} min` : undefined,
    })),
    category: categories[0]?.name ?? "",
    categories,
    createdAt: m.createdAt,
    rating: 0,
  }
}

const COURSES_PER_PAGE = 6

/**
 * Map curriculum sort chips to GET /training/modules `sortBy`.
 */
function curriculumSortParam(sortBy: string): string {
  if (sortBy === "title") return "moduleName:asc"
  if (sortBy === "title-desc") return "moduleName:desc"
  return "createdAt:desc"
}

/**
 * Compact pager indices for large catalogs.
 */
function pageWindow(current: number, total: number, span = 7): number[] {
  if (total <= 0) return []
  if (total <= span) return Array.from({ length: total }, (_, i) => i + 1)
  const half = Math.floor(span / 2)
  let start = Math.max(1, current - half)
  const end = Math.min(total, start + span - 1)
  start = Math.max(1, end - span + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

const TrainingCurriculum = () => {
  const [courses, setCourses] = useState<CurriculumCourse[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [instructors, setInstructors] = useState<string[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [apiLoading, setApiLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [scheduleDismissed, setScheduleDismissed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [progressFilter, setProgressFilter] = useState("")
  const [instructorFilter, setInstructorFilter] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [currentPage, setCurrentPage] = useState(1)
  const [openFilter, setOpenFilter] = useState<"category" | "progress" | "instructor" | null>(null)
  const [openSortDropdown, setOpenSortDropdown] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => window.clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    let cancelled = false
    setApiLoading(true)
    setLoadError(null)
    ;(async () => {
      try {
        if (progressFilter === "completed" || progressFilter === "in-progress") {
          if (cancelled) return
          setCourses([])
          setTotalResults(0)
          setTotalPages(1)
          return
        }
        const first = await listTrainingModules({
          limit: COURSES_PER_PAGE,
          page: currentPage,
          status: "published",
          mine: true,
          sortBy: curriculumSortParam(sortBy),
          ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
          ...(categoryFilter ? { category: categoryFilter } : {}),
          ...(instructorFilter ? { instructor: instructorFilter } : {}),
        })
        if (cancelled) return
        setCourses((first.results ?? []).map(mapModuleToCourse))
        setTotalResults(first.totalResults ?? 0)
        setTotalPages(Math.max(1, first.totalPages || 1))
        setCategories(first.facets?.categories ?? [])
        setInstructors(first.facets?.instructors ?? [])
        if ((first.totalPages ?? 1) > 0 && currentPage > (first.totalPages ?? 1)) {
          setCurrentPage(1)
        }
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : "Failed to load your modules."
        setLoadError(message)
        setCourses([])
        setTotalResults(0)
      } finally {
        if (!cancelled) setApiLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    currentPage,
    sortBy,
    debouncedSearch,
    categoryFilter,
    instructorFilter,
    progressFilter,
  ])

  const hasActiveFilters = Boolean(
    searchQuery.trim() || categoryFilter || instructorFilter || progressFilter
  )

  return (
    <Fragment>
      <Seo title={"Modules"} />
      <Pageheader
        currentpage="Modules"
        activepage="Training Management"
        mainpage="Training Curriculum"
        subtitle={
          apiLoading
            ? undefined
            : `${totalResults} module${totalResults !== 1 ? "s" : ""}`
        }
      />

      {/* Motivational cards */}
      <>
        {/* Start a weekly streak - Udemy style */}
          <div className="rounded-xl border border-[#e0e0e0] dark:border-white/10 bg-white dark:bg-white/5 mb-6 p-5 md:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <h4 className="font-bold text-[1.0625rem] text-[#1c1d1f] dark:text-white mb-1">
                  Start a weekly streak
                </h4>
                <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/50">
                  Let&apos;s chip away at your learning goals.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="text-center">
                  <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/50 mb-1">
                    Current streak
                  </p>
                  <p className="font-semibold text-defaulttextcolor dark:text-white text-[1.125rem]">
                    0 weeks
                  </p>
                </div>
                <div className="w-16 h-16 rounded-full border-[3px] border-primary flex items-center justify-center bg-white dark:bg-white/5 shrink-0">
                  <div className="text-center flex flex-col items-center justify-center">
                    <span className="flex items-center gap-1">
                      <span className="text-[0.75rem] font-semibold text-defaulttextcolor dark:text-white">0/30</span>
                      <i className="ti ti-info-circle text-[0.875rem] text-[#6a6f73] dark:text-white/50" aria-hidden />
                    </span>
                    <span className="text-[0.625rem] text-[#6a6f73] dark:text-white/50">min</span>
                  </div>
                </div>
                <div className="text-[0.75rem] text-[#6a6f73] dark:text-white/50 shrink-0">
                  1/1 visit
                  <br />
                  <span className="text-defaulttextcolor dark:text-white/70">Feb 9 - 16</span>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule learning time - Udemy layout: icon+title, description, then buttons left-aligned */}
          {!scheduleDismissed && (
            <div className="rounded-xl border border-[#e0e0e0] dark:border-white/10 bg-white dark:bg-white/5 mb-6 p-5 md:p-6 shadow-sm overflow-visible">
              <h4 className="font-bold text-[1.0625rem] text-[#1c1d1f] dark:text-white mb-2 flex items-center gap-2">
                <i className="ti ti-clock text-[1.375rem] text-[#1c1d1f] dark:text-white shrink-0" aria-hidden />
                Schedule learning time
              </h4>
              <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/60 leading-relaxed mb-4 max-w-[640px]">
                Learning a little each day adds up. Research shows that students who make
                learning a habit are more likely to reach their goals. Set time aside to
                learn and get reminders using your learning scheduler.
              </p>
              <div className="flex items-center gap-4 flex-shrink-0">
                <button
                  type="button"
                  className="ti-btn ti-btn-sm !bg-primary !text-white !border-primary !px-5 !py-2.5 !rounded-md whitespace-nowrap font-semibold shrink-0 min-w-[7.5rem]"
                >
                  Get started
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleDismissed(true)}
                  className="ti-btn ti-btn-sm !bg-transparent !text-primary !border-0 hover:!bg-primary/5 !px-4 !py-2.5 !rounded-md whitespace-nowrap font-medium shrink-0"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
      </>

      {/* Filters, module count, and search */}
      <CourseCatalogToolbar
        searchQuery={searchQuery}
        searchPlaceholder="Search my modules"
        onSearchQueryChange={(value) => {
          setSearchQuery(value)
          setCurrentPage(1)
        }}
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={(value) => {
          setCategoryFilter(value)
          setCurrentPage(1)
        }}
        progressFilter={progressFilter}
        onProgressFilterChange={(value) => {
          setProgressFilter(value)
          setCurrentPage(1)
        }}
        instructors={instructors}
        instructorFilter={instructorFilter}
        onInstructorFilterChange={(value) => {
          setInstructorFilter(value)
          setCurrentPage(1)
        }}
        sortBy={sortBy}
        openSortDropdown={openSortDropdown}
        onOpenSortChange={setOpenSortDropdown}
        onSortChange={(next: CourseCatalogSortBy) => {
          setSortBy(next)
          setCurrentPage(1)
        }}
        openFilter={openFilter}
        onOpenFilterChange={setOpenFilter}
      />

      {/* Module grid */}
      {apiLoading ? (
        <div className="text-center py-10 text-[#6a6f73] dark:text-white/50">
          Loading modules…
        </div>
      ) : loadError ? (
        <div className="text-center py-10 text-danger">{loadError}</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-10 text-[#6a6f73] dark:text-white/50">
          {hasActiveFilters
            ? "No modules match your filters."
            : "No modules assigned to your account yet."}
        </div>
      ) : (
        <section className="grid grid-cols-12 gap-4 xl:gap-6 mb-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </section>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="ti-btn ti-btn-sm ti-btn-outline-secondary !min-w-[2rem]"
            aria-label="Previous page"
          >
            <i className="ti ti-chevron-left"></i>
          </button>
          {pageWindow(currentPage, totalPages).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`ti-btn ti-btn-sm !min-w-[2rem] ${
                currentPage === page
                  ? "ti-btn-primary"
                  : "ti-btn-outline-secondary"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="ti-btn ti-btn-sm ti-btn-outline-secondary !min-w-[2rem]"
            aria-label="Next page"
          >
            <i className="ti ti-chevron-right"></i>
          </button>
        </div>
      )}
    </Fragment>
  )
}

function CourseCard({ course }: { course: CurriculumCourse }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="xl:col-span-2 lg:col-span-2 md:col-span-6 col-span-12 relative group">
      <Link
        href={`/training/curriculum/${course.id}/`}
        className="block no-underline"
      >
        <div className="h-full overflow-hidden rounded-lg border border-solid border-defaultborder/70 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-defaultborder/20 dark:bg-bodybg2">
          <div className="p-0">
            <div className="relative w-full aspect-[40/22] bg-defaultborder/20 dark:bg-white/5 overflow-hidden">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              {/* Hover overlay + play button (Udemy-style: white circle, dark play icon in middle) */}
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" aria-hidden />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <span className="w-16 h-16 rounded-full border-2 border-white bg-white flex items-center justify-center shadow-xl text-[#1c1d1f]">
                  <i className="ti ti-player-play text-[2rem] ml-1" aria-hidden />
                </span>
              </div>
            </div>
            {/* Kebab menu - visible on hover, outside thumbnail so dropdown is not clipped */}
            <div className="absolute top-2 end-2 z-20 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setMenuOpen((o) => !o)
                }}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white border border-white/20"
                aria-label="Module options"
              >
                <i className="ti ti-dots-vertical text-[1rem]"></i>
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[9]"
                    aria-hidden
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuOpen(false)
                    }}
                  />
                  <div className="absolute end-0 top-full mt-1 py-1 min-w-[140px] bg-bodybg dark:bg-white/10 border border-defaultborder dark:border-white/10 rounded-md shadow-lg z-[11]">
                    <button type="button" className="block w-full text-start px-4 py-2 text-[0.875rem] hover:bg-defaultborder/20 dark:hover:bg-white/10">
                      Remove from list
                    </button>
                    <button type="button" className="block w-full text-start px-4 py-2 text-[0.875rem] hover:bg-defaultborder/20 dark:hover:bg-white/10">
                      Archive
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 min-w-0 overflow-visible">
              <h3 className="text-[0.9375rem] font-bold mb-1 text-defaulttextcolor dark:text-white line-clamp-2">
                {course.title}
              </h3>
              <p className="text-[0.8125rem] text-[#6a6f73] dark:text-white/50 mb-3">
                {course.instructor}
              </p>
              <div className="h-1.5 w-full rounded-full bg-defaultborder/30 dark:bg-white/10 mb-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  role="progressbar"
                  style={{ width: `${course.progress}%` }}
                  aria-valuenow={course.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/50 mb-2">
                {course.progress}% complete
              </p>
              {course.rating != null && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="flex text-warning">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <i
                        key={i}
                        className={`ti ${i <= course.rating! ? "ti-star-filled" : "ti-star"} text-[0.875rem]`}
                      />
                    ))}
                  </span>
                  <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                    Your rating
                  </span>
                </div>
              )}
              <span
                className="block mt-3 text-[0.875rem] font-bold whitespace-nowrap outline-none border-0 bg-transparent cursor-pointer text-[#5624d0] hover:text-[#401b9e] hover:underline dark:text-primary dark:hover:text-primary/90"
              >
                {course.progress === 0
                  ? "START MODULE"
                  : course.progress === 100
                    ? "Review module"
                    : "Continue Learning"}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

export default TrainingCurriculum
