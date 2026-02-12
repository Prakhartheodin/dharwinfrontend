"use client"

import Pageheader from "@/shared/layout-components/page-header/pageheader"
import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useState, useMemo } from "react"
import Link from "next/link"
import { MY_COURSES } from "@/shared/data/training/courses-data"
import type { Course } from "@/shared/data/training/courses-data"

const COURSES_PER_PAGE = 6

const TrainingCurriculum = () => {
  const [scheduleDismissed, setScheduleDismissed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [progressFilter, setProgressFilter] = useState("")
  const [instructorFilter, setInstructorFilter] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [currentPage, setCurrentPage] = useState(1)
  const [openFilter, setOpenFilter] = useState<"category" | "progress" | "instructor" | null>(null)
  const [openSortDropdown, setOpenSortDropdown] = useState(false)

  const categories = useMemo(() => {
    const set = new Set(MY_COURSES.map((c) => c.category).filter(Boolean))
    return Array.from(set) as string[]
  }, [])
  const instructors = useMemo(() => {
    const set = new Set(MY_COURSES.map((c) => c.instructor))
    return Array.from(set)
  }, [])

  const filteredCourses = useMemo(() => {
    let list = [...MY_COURSES]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.instructor.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) list = list.filter((c) => c.category === categoryFilter)
    if (instructorFilter)
      list = list.filter((c) => c.instructor === instructorFilter)
    if (progressFilter === "completed")
      list = list.filter((c) => c.progress === 100)
    if (progressFilter === "in-progress")
      list = list.filter((c) => c.progress > 0 && c.progress < 100)
    if (progressFilter === "not-started") list = list.filter((c) => c.progress === 0)
    if (sortBy === "recent") list = [...list].reverse()
    if (sortBy === "title") list = [...list].sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [searchQuery, categoryFilter, instructorFilter, progressFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / COURSES_PER_PAGE))
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * COURSES_PER_PAGE
    return filteredCourses.slice(start, start + COURSES_PER_PAGE)
  }, [filteredCourses, currentPage])

  return (
    <Fragment>
      <Seo title={"Modules"} />
      <Pageheader
        currentpage="Modules"
        activepage="Training Management"
        mainpage="Training Curriculum"
      />

      {/* Dark header - Modules */}
      <div className="bg-[#1c1d1f] dark:bg-[#0d0d0d] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 mb-6 rounded-b-md">
        <h2 className="text-white text-[1.75rem] font-bold">Modules</h2>
      </div>

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
      <div className="flex flex-wrap items-center gap-4 mb-5">
          <span className="text-[0.875rem] font-semibold text-defaulttextcolor dark:text-white">
            {filteredCourses.length} module{filteredCourses.length !== 1 ? "s" : ""}
          </span>
          {/* Categories filter button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilter(openFilter === "category" ? null : "category")}
              className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f5] dark:bg-white/10 border border-[#e0e0e0] dark:border-white/20 px-4 py-2 text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white hover:bg-[#ebebeb] dark:hover:bg-white/15 transition-colors"
            >
              {categoryFilter || "Categories"}
              <i className="ti ti-chevron-down text-[0.875rem] text-[#6a6f73] dark:text-white/60" />
            </button>
            {openFilter === "category" && (
              <>
                <div className="fixed inset-0 z-[100]" aria-hidden onClick={() => setOpenFilter(null)} />
                <div className="absolute left-0 top-full mt-1 z-[101] min-w-[180px] rounded-lg border border-[#e0e0e0] dark:border-white/10 bg-white dark:bg-[#1c1d1f] shadow-lg py-1">
                  <button type="button" onClick={() => { setCategoryFilter(""); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem] text-[#6a6f73] dark:text-white/70 hover:bg-[#f5f5f5] dark:hover:bg-white/10">
                    All categories
                  </button>
                  {categories.map((cat) => (
                    <button key={cat} type="button" onClick={() => { setCategoryFilter(cat); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem] text-[#1c1d1f] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10">
                      {cat}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Progress filter button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilter(openFilter === "progress" ? null : "progress")}
              className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f5] dark:bg-white/10 border border-[#e0e0e0] dark:border-white/20 px-4 py-2 text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white hover:bg-[#ebebeb] dark:hover:bg-white/15 transition-colors"
            >
              {progressFilter === "not-started" ? "Not started" : progressFilter === "in-progress" ? "In progress" : progressFilter === "completed" ? "Completed" : "Progress"}
              <i className="ti ti-chevron-down text-[0.875rem] text-[#6a6f73] dark:text-white/60" />
            </button>
            {openFilter === "progress" && (
              <>
                <div className="fixed inset-0 z-[100]" aria-hidden onClick={() => setOpenFilter(null)} />
                <div className="absolute left-0 top-full mt-1 z-[101] min-w-[160px] rounded-lg border border-[#e0e0e0] dark:border-white/10 bg-white dark:bg-[#1c1d1f] shadow-lg py-1">
                  <button type="button" onClick={() => { setProgressFilter(""); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem] text-[#6a6f73] dark:text-white/70 hover:bg-[#f5f5f5] dark:hover:bg-white/10">All</button>
                  <button type="button" onClick={() => { setProgressFilter("not-started"); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem] text-[#1c1d1f] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10">Not started</button>
                  <button type="button" onClick={() => { setProgressFilter("in-progress"); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem] text-[#1c1d1f] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10">In progress</button>
                  <button type="button" onClick={() => { setProgressFilter("completed"); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem] text-[#1c1d1f] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10">Completed</button>
                </div>
              </>
            )}
          </div>
          {/* Instructor filter button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilter(openFilter === "instructor" ? null : "instructor")}
              className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f5] dark:bg-white/10 border border-[#e0e0e0] dark:border-white/20 px-4 py-2 text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white hover:bg-[#ebebeb] dark:hover:bg-white/15 transition-colors"
            >
              {instructorFilter || "Instructor"}
              <i className="ti ti-chevron-down text-[0.875rem] text-[#6a6f73] dark:text-white/60" />
            </button>
            {openFilter === "instructor" && (
              <>
                <div className="fixed inset-0 z-[100]" aria-hidden onClick={() => setOpenFilter(null)} />
                <div className="absolute left-0 top-full mt-1 z-[101] min-w-[180px] max-h-[280px] overflow-y-auto rounded-lg border border-[#e0e0e0] dark:border-white/10 bg-white dark:bg-[#1c1d1f] shadow-lg py-1">
                  <button type="button" onClick={() => { setInstructorFilter(""); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem] text-[#6a6f73] dark:text-white/70 hover:bg-[#f5f5f5] dark:hover:bg-white/10">All instructors</button>
                  {instructors.map((inst) => (
                    <button key={inst} type="button" onClick={() => { setInstructorFilter(inst); setOpenFilter(null); }} className="block w-full text-left px-4 py-2 text-[0.875rem] text-[#1c1d1f] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10">
                      {inst}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex-1 min-w-[200px] max-w-sm ms-auto flex items-center gap-2">
            <input
              type="text"
              placeholder="Search my modules"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-[#e0e0e0] dark:border-white/20 bg-white dark:bg-white/5 px-3 py-2 text-[0.875rem] text-[#1c1d1f] dark:text-white placeholder:text-[#6a6f73] dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="button"
              className="flex items-center justify-center w-10 h-[2.25rem] shrink-0 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              aria-label="Search modules"
            >
              <i className="ti ti-search text-[1rem]" />
            </button>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpenSortDropdown(!openSortDropdown)}
              className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f5] dark:bg-white/10 border border-[#e0e0e0] dark:border-white/20 px-4 py-2 text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white hover:bg-[#ebebeb] dark:hover:bg-white/15 transition-colors"
            >
              {sortBy === "recent" ? "Recently Accessed" : "Title A-Z"}
              <i className="ti ti-chevron-down text-[0.875rem] text-[#6a6f73] dark:text-white/60" />
            </button>
            {openSortDropdown && (
              <>
                <div className="fixed inset-0 z-[100]" aria-hidden onClick={() => setOpenSortDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 z-[101] min-w-[180px] rounded-lg border border-[#e0e0e0] dark:border-white/10 bg-white dark:bg-[#1c1d1f] shadow-lg py-1">
                  <button type="button" onClick={() => { setSortBy("recent"); setOpenSortDropdown(false); }} className="block w-full text-left px-4 py-2 text-[0.875rem] text-[#1c1d1f] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10">
                    Recently Accessed
                  </button>
                  <button type="button" onClick={() => { setSortBy("title"); setOpenSortDropdown(false); }} className="block w-full text-left px-4 py-2 text-[0.875rem] text-[#1c1d1f] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10">
                    Title A-Z
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      {/* Module grid */}
      <section className="grid grid-cols-12 gap-4 xl:gap-6 mb-6">
        {paginatedCourses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </section>

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
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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

function CourseCard({ course }: { course: Course }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="xl:col-span-2 lg:col-span-2 md:col-span-6 col-span-12 relative group">
      <Link
        href={`/training/curriculum/${course.id}/`}
        className="block no-underline"
      >
        <div className="bg-bodybg dark:bg-white/5 border border-defaultborder dark:border-white/10 h-full rounded-lg overflow-hidden shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/20 hover:border-primary/30 hover:-translate-y-0.5">
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
