"use client"

import Pageheader from "@/shared/layout-components/page-header/pageheader"
import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/shared/contexts/auth-context"
import {
  COURSES_PERMISSION_PREFIX,
  hasPermissionForPath,
} from "@/shared/lib/route-permissions"
import {
  getMyStudent,
  listStudentCourses,
  mapStudentCourseToCard,
  COURSE_THUMBNAIL_PLACEHOLDER,
  type StudentCourseListItem,
} from "@/shared/lib/api/student-courses"
import CourseCatalogToolbar from "@/shared/components/course-catalog-toolbar"
import type { CourseCatalogSortBy } from "@/shared/components/course-catalog-sort-dropdown"

const COURSES_PER_PAGE = 9
const PLACEHOLDER_IMAGE = COURSE_THUMBNAIL_PLACEHOLDER

/**
 * Map catalog sort chips to student-courses `sortBy` query values.
 */
function catalogSortParam(sortBy: string): string {
  if (sortBy === "title") return "title"
  if (sortBy === "title-desc") return "title-desc"
  return "recent"
}

/**
 * Compact pager indices so 1000 courses do not render 112 buttons.
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

export type CourseCardItem = {
  id: string
  title: string
  instructor: string
  thumbnail: string
  progress: number
  category?: string
  status?: string
  rating?: number
}

export default function CandidateCoursesPage() {
  const { permissions: userPermissions, permissionsLoaded } = useAuth()
  const hasCoursesPermission =
    permissionsLoaded &&
    hasPermissionForPath(userPermissions, COURSES_PERMISSION_PREFIX)

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [progressFilter, setProgressFilter] = useState("")
  const [instructorFilter, setInstructorFilter] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [currentPage, setCurrentPage] = useState(1)
  const [openFilter, setOpenFilter] = useState<"category" | "progress" | "instructor" | null>(null)
  const [openSortDropdown, setOpenSortDropdown] = useState(false)
  // const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const [courses, setCourses] = useState<CourseCardItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [instructors, setInstructors] = useState<string[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noStudent, setNoStudent] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => window.clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    if (!permissionsLoaded) return
    if (!hasCoursesPermission) {
      setLoading(false)
      setCourses([])
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      setNoStudent(false)
      try {
        const student = await getMyStudent()
        if (cancelled) return
        const progress =
          progressFilter === "completed" ||
          progressFilter === "in-progress" ||
          progressFilter === "not-started"
            ? progressFilter
            : undefined
        const res = await listStudentCourses(student.id, {
          page: currentPage,
          limit: COURSES_PER_PAGE,
          sortBy: catalogSortParam(sortBy),
          ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
          ...(categoryFilter ? { category: categoryFilter } : {}),
          ...(instructorFilter ? { instructor: instructorFilter } : {}),
          ...(progress ? { progress } : {}),
        })
        if (cancelled) return
        const mapped = res.results.map((item: StudentCourseListItem) => {
          const c = mapStudentCourseToCard(item)
          return {
            ...c,
            thumbnail: c.thumbnail || PLACEHOLDER_IMAGE,
            rating: undefined,
          } as CourseCardItem
        })
        setCourses(mapped)
        setTotalResults(res.totalResults ?? 0)
        setTotalPages(Math.max(1, res.totalPages || 1))
        setCategories(res.facets?.categories ?? [])
        setInstructors(res.facets?.instructors ?? [])
        if ((res.totalPages ?? 1) > 0 && currentPage > (res.totalPages ?? 1)) {
          setCurrentPage(1)
        }
      } catch (e: unknown) {
        if (cancelled) return
        const err = e as { response?: { status?: number } }
        if (err.response?.status === 404) {
          setNoStudent(true)
          setCourses([])
          setTotalResults(0)
        } else {
          setError(err instanceof Error ? err.message : "Failed to load courses")
          setCourses([])
          setTotalResults(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [
    permissionsLoaded,
    hasCoursesPermission,
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

  if (!permissionsLoaded) {
    return (
      <Fragment>
        <Seo title="My Courses" />
        <div className="flex justify-center py-12">
          <div className="ti-btn ti-btn-primary ti-btn-loading">Checking access...</div>
        </div>
      </Fragment>
    )
  }

  if (!hasCoursesPermission) {
    return (
      <Fragment>
        <Seo title="My Courses" />
        <div className="rounded-lg border border-defaultborder bg-bodybg dark:bg-white/5 px-4 py-10 text-center my-8">
          <p className="text-[1rem] font-semibold text-defaulttextcolor dark:text-white mb-2">
            Access denied
          </p>
          <p className="text-[#6a6f73] dark:text-white/60 text-[0.875rem]">
            You do not have permission to view Courses. Contact your administrator if you believe this is a mistake.
          </p>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title="My Courses" />
      <Pageheader
        currentpage="My Courses"
        activepage="Courses"
        mainpage="My Courses"
        subtitle={
          loading
            ? undefined
            : `${totalResults} course${totalResults !== 1 ? "s" : ""}`
        }
      />

      {/* Search + filters */}
      <CourseCatalogToolbar
        searchQuery={searchQuery}
        searchPlaceholder="Search my courses"
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

      {loading && (
        <div className="flex justify-center py-12">
          <div className="ti-btn ti-btn-primary ti-btn-loading">Loading courses...</div>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-danger dark:text-danger mb-6">
          {error}
        </div>
      )}
      {noStudent && !loading && (
        <div className="rounded-lg border border-defaultborder bg-bodybg dark:bg-white/5 px-4 py-6 text-center text-[#6a6f73] dark:text-white/60 mb-6">
          You don&apos;t have a student profile yet. Contact your administrator to get access to courses.
        </div>
      )}
      {!loading && !error && !noStudent && courses.length === 0 && (
        <div className="rounded-lg border border-defaultborder bg-bodybg dark:bg-white/5 px-4 py-10 text-center mb-6">
          <p className="text-[#6a6f73] dark:text-white/60 text-[0.9375rem] mb-1">
            {hasActiveFilters
              ? "No courses match your filters. Try changing filters or search."
              : "No courses assigned yet. Contact your administrator to get access to courses."}
          </p>
        </div>
      )}
      {!loading && !error && !noStudent && courses.length > 0 && (
      <section className="grid grid-cols-12 gap-4 xl:gap-6 mb-6">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            // menuOpen={menuOpenId === course.id}
            // onMenuToggle={() => setMenuOpenId(menuOpenId === course.id ? null : course.id)}
            // onMenuClose={() => setMenuOpenId(null)}
          />
        ))}
      </section>
      )}

      {!loading && !error && !noStudent && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="ti-btn ti-btn-sm ti-btn-outline-secondary !min-w-[2rem]">
            <i className="ti ti-chevron-left" />
          </button>
          {pageWindow(currentPage, totalPages).map((page) => (
            <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`ti-btn ti-btn-sm !min-w-[2rem] ${currentPage === page ? "ti-btn-primary" : "ti-btn-outline-secondary"}`}>{page}</button>
          ))}
          <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="ti-btn ti-btn-sm ti-btn-outline-secondary !min-w-[2rem]">
            <i className="ti ti-chevron-right" />
          </button>
        </div>
      )}
    </Fragment>
  )
}

/** Valid MongoDB ObjectId (24 hex chars) – required for course detail/learn URLs. */
function isValidCourseId(id: string): boolean {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id.trim())
}

function CourseCard({
  course,
  // menuOpen,
  // onMenuToggle,
  // onMenuClose,
}: {
  course: CourseCardItem
  // menuOpen: boolean
  // onMenuToggle: () => void
  // onMenuClose: () => void
}) {
  const router = useRouter()
  const [thumbnailSrc, setThumbnailSrc] = useState(course.thumbnail || PLACEHOLDER_IMAGE)
  const canNavigate = isValidCourseId(course.id)
  const detailHref = canNavigate ? `/courses/${course.id}/` : "/courses/"
  useEffect(() => {
    setThumbnailSrc(course.thumbnail || PLACEHOLDER_IMAGE)
  }, [course.thumbnail])
  const openCourse = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    if (canNavigate) router.push(detailHref)
    else router.push("/courses/")
  }
  return (
    <div className="xl:col-span-4 lg:col-span-4 md:col-span-6 col-span-12 relative group">
      <div
        role="button"
        tabIndex={0}
        onClick={openCourse}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (canNavigate) router.push(detailHref); else router.push("/courses/"); } }}
        className="h-full overflow-hidden rounded-lg border border-solid border-defaultborder/70 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-defaultborder/20 dark:bg-bodybg2 cursor-pointer"
      >
        <div className="relative w-full aspect-[40/22] bg-defaultborder/20 overflow-hidden">
          <img
            src={thumbnailSrc}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={() => {
              if (thumbnailSrc !== PLACEHOLDER_IMAGE) setThumbnailSrc(PLACEHOLDER_IMAGE)
            }}
          />
          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="w-14 h-14 rounded-full border-2 border-white bg-white flex items-center justify-center shadow-xl text-[#1c1d1f]">
              <i className="ti ti-player-play text-[1.5rem] ml-1" />
            </span>
          </div>
        </div>
        {/* Course options (dots) menu — hidden for now
        <div className="absolute top-2 end-2 z-20">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMenuToggle(); }}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white border border-white/20"
            aria-label="Course options"
          >
            <i className="ti ti-dots-vertical text-[1rem]" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[9]" aria-hidden onClick={(e) => { e.preventDefault(); onMenuClose(); }} />
              <div className="absolute end-0 top-full mt-1 py-1 min-w-[140px] bg-bodybg dark:bg-white/10 border border-defaultborder rounded-md shadow-lg z-[11]">
                <button type="button" className="block w-full text-start px-4 py-2 text-[0.875rem] hover:bg-black/5 dark:hover:bg-white/10">Remove from list</button>
                <button type="button" className="block w-full text-start px-4 py-2 text-[0.875rem] hover:bg-black/5 dark:hover:bg-white/10">Archive</button>
              </div>
            </>
          )}
        </div>
        */}
        <div className="p-4">
          <h3 className="text-[0.9375rem] font-bold mb-1 text-defaulttextcolor dark:text-white line-clamp-2">{course.title}</h3>
          <p className="text-[0.8125rem] text-[#6a6f73] dark:text-white/50 mb-3">{course.instructor}</p>
          <div className="h-1.5 w-full rounded-full bg-defaultborder/30 dark:bg-white/10 mb-2 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${course.progress}%` }} role="progressbar" aria-valuenow={course.progress} aria-valuemin={0} aria-valuemax={100} />
          </div>
          <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/50 mb-2">{course.progress}% complete</p>
          {course.rating != null && course.progress > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <span className="flex text-warning">
                {[1, 2, 3, 4, 5].map((i) => (
                  <i key={i} className={`ti ${i <= course.rating! ? "ti-star-filled" : "ti-star"} text-[0.875rem]`} />
                ))}
              </span>
              <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">Your rating</span>
            </div>
          )}
          <span className="block mt-3 text-[0.875rem] font-bold text-[#5624d0] hover:text-[#401b9e] hover:underline dark:text-primary">
            {course.progress === 0 ? "START COURSE" : course.progress === 100 ? "Review course" : "Continue Learning"}
          </span>
        </div>
      </div>
    </div>
  )
}
