"use client"

import Pageheader from "@/shared/layout-components/page-header/pageheader"
import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  getMyStudent,
  listStudentCourses,
  mapStudentCourseToCard,
  type StudentCourseListItem,
} from "@/shared/lib/api/student-courses"

const COURSES_PER_PAGE = 9
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=220&fit=crop"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [progressFilter, setProgressFilter] = useState("")
  const [instructorFilter, setInstructorFilter] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [currentPage, setCurrentPage] = useState(1)
  const [openFilter, setOpenFilter] = useState<"category" | "progress" | "instructor" | null>(null)
  const [openSortDropdown, setOpenSortDropdown] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const [courses, setCourses] = useState<CourseCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noStudent, setNoStudent] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      setNoStudent(false)
      try {
        const student = await getMyStudent()
        if (cancelled) return
        const res = await listStudentCourses(student.id, { limit: 200 })
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
      } catch (e: unknown) {
        if (cancelled) return
        const err = e as { response?: { status?: number } }
        if (err.response?.status === 404) {
          setNoStudent(true)
          setCourses([])
        } else {
          setError(err instanceof Error ? err.message : "Failed to load courses")
          setCourses([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const categories = useMemo(() => {
    const set = new Set(courses.map((c) => c.category).filter(Boolean))
    return Array.from(set) as string[]
  }, [courses])
  const instructors = useMemo(() => {
    const set = new Set(courses.map((c) => c.instructor))
    return Array.from(set)
  }, [courses])

  const filteredCourses = useMemo(() => {
    let list = [...courses]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.instructor.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) list = list.filter((c) => c.category === categoryFilter)
    if (instructorFilter) list = list.filter((c) => c.instructor === instructorFilter)
    if (progressFilter === "completed") list = list.filter((c) => c.progress === 100)
    if (progressFilter === "in-progress") list = list.filter((c) => c.progress > 0 && c.progress < 100)
    if (progressFilter === "not-started") list = list.filter((c) => c.progress === 0)
    if (sortBy === "recent") list = [...list].reverse()
    if (sortBy === "title") list = [...list].sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [courses, searchQuery, categoryFilter, instructorFilter, progressFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / COURSES_PER_PAGE))
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * COURSES_PER_PAGE
    return filteredCourses.slice(start, start + COURSES_PER_PAGE)
  }, [filteredCourses, currentPage])

  return (
    <Fragment>
      <Seo title="My Courses" />
      <Pageheader
        currentpage="My Courses"
        activepage="Courses"
        mainpage="My Courses"
      />

      <div className="bg-[#1c1d1f] dark:bg-[#0d0d0d] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 mb-6 rounded-b-md">
        <h2 className="text-white text-[1.75rem] font-bold">My Courses</h2>
      </div>

      {/* Filters, count, search - Udemy-style */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <span className="text-[0.875rem] font-semibold text-defaulttextcolor dark:text-white">
          {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenFilter(openFilter === "category" ? null : "category")}
            className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f5] dark:bg-white/10 border border-[#e0e0e0] dark:border-white/20 px-4 py-2 text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white hover:bg-[#ebebeb] dark:hover:bg-white/15"
          >
            {categoryFilter || "Categories"}
            <i className="ti ti-chevron-down text-[0.875rem] text-[#6a6f73] dark:text-white/60" />
          </button>
          {openFilter === "category" && (
            <>
              <div className="fixed inset-0 z-[100]" aria-hidden onClick={() => setOpenFilter(null)} />
              <div className="absolute left-0 top-full mt-1 z-[101] min-w-[180px] rounded-lg border border-defaultborder bg-bodybg dark:bg-[#1c1d1f] shadow-lg py-1">
                <button type="button" onClick={() => { setCategoryFilter(""); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem]">All categories</button>
                {categories.map((cat) => (
                  <button key={cat} type="button" onClick={() => { setCategoryFilter(cat); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem] hover:bg-black/5 dark:hover:bg-white/10">{cat}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenFilter(openFilter === "progress" ? null : "progress")}
            className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f5] dark:bg-white/10 border border-[#e0e0e0] dark:border-white/20 px-4 py-2 text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white"
          >
            {progressFilter === "not-started" ? "Not started" : progressFilter === "in-progress" ? "In progress" : progressFilter === "completed" ? "Completed" : "Progress"}
            <i className="ti ti-chevron-down text-[0.875rem]" />
          </button>
          {openFilter === "progress" && (
            <>
              <div className="fixed inset-0 z-[100]" aria-hidden onClick={() => setOpenFilter(null)} />
              <div className="absolute left-0 top-full mt-1 z-[101] min-w-[160px] rounded-lg border border-defaultborder bg-bodybg dark:bg-[#1c1d1f] shadow-lg py-1">
                <button type="button" onClick={() => { setProgressFilter(""); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem]">All</button>
                <button type="button" onClick={() => { setProgressFilter("not-started"); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem]">Not started</button>
                <button type="button" onClick={() => { setProgressFilter("in-progress"); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem]">In progress</button>
                <button type="button" onClick={() => { setProgressFilter("completed"); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem]">Completed</button>
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenFilter(openFilter === "instructor" ? null : "instructor")}
            className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f5] dark:bg-white/10 border border-[#e0e0e0] dark:border-white/20 px-4 py-2 text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white"
          >
            {instructorFilter || "Instructor"}
            <i className="ti ti-chevron-down text-[0.875rem]" /> 
          </button>
          {openFilter === "instructor" && (
            <>
              <div className="fixed inset-0 z-[100]" aria-hidden onClick={() => setOpenFilter(null)} />
              <div className="absolute left-0 top-full mt-1 z-[101] min-w-[180px] max-h-[280px] overflow-y-auto rounded-lg border border-defaultborder bg-bodybg dark:bg-[#1c1d1f] shadow-lg py-1">
                <button type="button" onClick={() => { setInstructorFilter(""); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem]">All instructors</button>
                {instructors.map((inst) => (
                  <button key={inst} type="button" onClick={() => { setInstructorFilter(inst); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem] hover:bg-black/5 dark:hover:bg-white/10">{inst}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex-1 min-w-[200px] max-w-sm ms-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Search my courses"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-defaultborder bg-bodybg dark:bg-white/5 px-3 py-2 text-[0.875rem] focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button type="button" className="flex items-center justify-center w-10 h-[2.25rem] shrink-0 rounded-lg bg-primary text-white" aria-label="Search">
            <i className="ti ti-search text-[1rem]" />
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenSortDropdown(!openSortDropdown)}
            className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f5] dark:bg-white/10 border border-[#e0e0e0] dark:border-white/20 px-4 py-2 text-[0.875rem] font-medium"
          >
            {sortBy === "recent" ? "Recently Accessed" : "Title A-Z"}
            <i className="ti ti-chevron-down text-[0.875rem]" />
          </button>
          {openSortDropdown && (
            <>
              <div className="fixed inset-0 z-[100]" aria-hidden onClick={() => setOpenSortDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 z-[101] min-w-[180px] rounded-lg border border-defaultborder bg-bodybg dark:bg-[#1c1d1f] shadow-lg py-1">
                <button type="button" onClick={() => { setSortBy("recent"); setOpenSortDropdown(false); }} className="block w-full text-left px-4 py-2 text-[0.875rem]">Recently Accessed</button>
                <button type="button" onClick={() => { setSortBy("title"); setOpenSortDropdown(false); }} className="block w-full text-left px-4 py-2 text-[0.875rem]">Title A-Z</button>
              </div>
            </>
          )}
        </div>
      </div>

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
      {!loading && !error && !noStudent && filteredCourses.length === 0 && (
        <div className="rounded-lg border border-defaultborder bg-bodybg dark:bg-white/5 px-4 py-10 text-center mb-6">
          <p className="text-[#6a6f73] dark:text-white/60 text-[0.9375rem] mb-1">
            {courses.length === 0
              ? "No courses assigned yet. Contact your administrator to get access to courses."
              : "No courses match your filters. Try changing filters or search."}
          </p>
        </div>
      )}
      {!loading && !error && !noStudent && filteredCourses.length > 0 && (
      <section className="grid grid-cols-12 gap-4 xl:gap-6 mb-6">
        {paginatedCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            menuOpen={menuOpenId === course.id}
            onMenuToggle={() => setMenuOpenId(menuOpenId === course.id ? null : course.id)}
            onMenuClose={() => setMenuOpenId(null)}
          />
        ))}
      </section>
      )}

      {!loading && !error && !noStudent && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="ti-btn ti-btn-sm ti-btn-outline-secondary !min-w-[2rem]">
            <i className="ti ti-chevron-left" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
  menuOpen,
  onMenuToggle,
  onMenuClose,
}: {
  course: CourseCardItem
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
}) {
  const router = useRouter()
  const canNavigate = isValidCourseId(course.id)
  const detailHref = canNavigate ? `/courses/${course.id}/` : "/courses/"
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
        className="bg-bodybg dark:bg-white/5 border border-defaultborder dark:border-white/10 h-full rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all cursor-pointer"
      >
        <div className="relative w-full aspect-[40/22] bg-defaultborder/20 overflow-hidden">
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="w-14 h-14 rounded-full border-2 border-white bg-white flex items-center justify-center shadow-xl text-[#1c1d1f]">
              <i className="ti ti-player-play text-[1.5rem] ml-1" />
            </span>
          </div>
        </div>
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
