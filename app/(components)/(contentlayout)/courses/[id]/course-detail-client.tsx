"use client"

import Pageheader from "@/shared/layout-components/page-header/pageheader"
import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useState, useMemo } from "react"
import Link from "next/link"
import type { Course, CourseSection } from "@/shared/data/training/courses-data"

function totalLecturesAndDuration(sections: CourseSection[]) {
  let lectures = 0
  let totalMin = 0
  sections.forEach((s) => {
    s.lectures.forEach((l) => {
      lectures += 1
      const d = l.duration
      if (d) {
        const m = d.match(/(\d+)\s*hr/)
        const n = d.match(/(\d+)\s*min/)
        if (m) totalMin += parseInt(m[1], 10) * 60
        if (n) totalMin += parseInt(n[1], 10)
      }
    })
  })
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  const durationStr = hours ? `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim() : `${totalMin}m`
  return { lectures, durationStr }
}

export default function CourseDetailClient({ course }: { course: Course }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandAll, setExpandAll] = useState(false)

  const learningPoints = course.learningPoints ?? []
  const leftCol = learningPoints.slice(0, Math.ceil(learningPoints.length / 2))
  const rightCol = learningPoints.slice(Math.ceil(learningPoints.length / 2))
  const relatedTopics = course.relatedTopics ?? []
  const requirements = course.requirements ?? []
  const includes = course.courseIncludes
  const codingDesc = course.codingExercisesDescription

  const sections: CourseSection[] = useMemo(() => {
    if (course.courseSections?.length) return course.courseSections
    if (course.lessons?.length) {
      return [{ id: "default", title: "Course content", lectures: course.lessons }]
    }
    return []
  }, [course.courseSections, course.lessons])

  const { lectures: totalLectures, durationStr: totalDuration } = useMemo(
    () => (sections.length ? totalLecturesAndDuration(sections) : { lectures: 0, durationStr: "0m" }),
    [sections]
  )

  const totalCompleted = useMemo(
    () => sections.reduce((acc, s) => acc + s.lectures.filter((l) => l.isCompleted).length, 0),
    [sections]
  )

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const setExpandAllSections = (open: boolean) => {
    setExpandAll(open)
    if (open) setExpandedSections(new Set(sections.map((s) => s.id)))
    else setExpandedSections(new Set())
  }

  const isExpanded = (id: string) => expandAll || expandedSections.has(id)

  return (
    <Fragment>
      <Seo title={course.title} />
      <Pageheader
        currentpage={course.title}
        activepage="Courses"
        mainpage="My Courses"
      />

      {/* Breadcrumbs - dark header */}
      <div className="bg-[#1c1d1f] dark:bg-[#0d0d0d] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-5 pb-6">
        <div className="max-w-[1280px] mx-auto">
          <nav className="text-[0.8125rem] text-white/70 mb-4" aria-label="Breadcrumb">
            <Link href="/courses/" className="hover:text-[#cec0fc] hover:underline">Courses</Link>
            {course.category && (
              <>
                <span className="mx-1.5">›</span>
                <span>{course.category}</span>
              </>
            )}
            <span className="mx-1.5">›</span>
            <span className="text-white/90 truncate max-w-[220px] inline-block align-bottom" title={course.title}>{course.title}</span>
          </nav>
          {course.badges && course.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {course.badges.map((badge) => (
                <span
                  key={badge}
                  className={`inline-block rounded px-2 py-0.5 text-[0.75rem] font-semibold ${
                    badge === "Bestseller"
                      ? "bg-[#eceb98] text-[#3d3c0a]"
                      : badge === "Highest Rated"
                        ? "bg-[#f3ca8c] text-[#594a05]"
                        : "bg-white/10 text-white"
                  }`}
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-white text-[1.5rem] sm:text-[1.75rem] font-bold mb-1.5 leading-tight">{course.title}</h1>
          {course.tagline && (
            <p className="text-white/90 text-[0.9375rem] sm:text-[1rem] mb-3 leading-snug">{course.tagline}</p>
          )}
          <p className="text-white/70 text-[0.8125rem]">Created by <Link href="#" className="text-[#cec0fc] hover:underline dark:text-primary">{course.instructor}</Link></p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[0.8125rem] text-white/70">
            {course.lastUpdated && (
              <span className="flex items-center gap-1.5">
                <i className="ti ti-calendar text-[0.875rem]" />
                Last updated {course.lastUpdated}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* White highlights band: Premium callout | Rating | Learners (Udemy-style) */}
      <div className="bg-white dark:bg-bodybg border-b border-[#d1d7dc] dark:border-white/10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center gap-6 lg:gap-10">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#5624d0]/10 dark:bg-primary/10 border border-[#5624d0]/20 dark:border-primary/20">
            <i className="ti ti-lock-open text-[#5624d0] dark:text-primary text-[1.125rem]" />
            <span className="text-[0.875rem] font-medium text-[#5624d0] dark:text-primary">Full access included. No purchase required.</span>
          </div>
          {course.ratingDisplay != null && (
            <div className="flex items-center gap-2">
              <span className="text-[1.125rem] font-bold text-defaulttextcolor dark:text-white">{course.ratingDisplay}</span>
              <span className="flex text-[#e59819]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <i key={i} className={`ti ${i <= Math.round(course.ratingDisplay!) ? "ti-star-filled" : "ti-star"} text-[0.875rem]`} />
                ))}
              </span>
              {course.ratingCount != null && (
                <span className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60">({course.ratingCount.toLocaleString()} ratings)</span>
              )}
            </div>
          )}
          {course.learnerCount != null && (
            <div className="flex items-center gap-2">
              <i className="ti ti-users text-[1.125rem] text-[#6a6f73] dark:text-white/60" />
              <span className="text-[0.875rem] text-defaulttextcolor dark:text-white">{course.learnerCount.toLocaleString()} learners</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row gap-10 lg:gap-12 pt-8 pb-8">
        {/* Left: main content */}
        <div className="flex-1 min-w-0">
          {/* What you'll learn - purple checkmarks like reference */}
          <section className="mb-8">
            <h2 className="text-[1.25rem] font-bold text-[#1c1d1f] dark:text-white mb-4">What you&apos;ll learn</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2.5">
              <ul className="list-none p-0 m-0 space-y-2.5">
                {leftCol.map((point, i) => (
                  <li key={i} className="flex gap-3 text-[0.9375rem] text-[#1c1d1f] dark:text-white leading-snug">
                    <i className="ti ti-circle-check text-[#5624d0] dark:text-primary shrink-0 mt-0.5 text-[1.125rem]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <ul className="list-none p-0 m-0 space-y-2.5">
                {rightCol.map((point, i) => (
                  <li key={i} className="flex gap-3 text-[0.9375rem] text-[#1c1d1f] dark:text-white leading-snug">
                    <i className="ti ti-circle-check text-[#5624d0] dark:text-primary shrink-0 mt-0.5 text-[1.125rem]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Explore related topics - rounded rectangular tags */}
          {relatedTopics.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[1.25rem] font-bold text-[#1c1d1f] dark:text-white mb-3">Explore related topics</h2>
              <div className="flex flex-wrap gap-2">
                {relatedTopics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-block px-4 py-2 rounded-md bg-white dark:bg-white/5 border border-[#d1d7dc] dark:border-white/20 text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white hover:bg-[#f7f9fa] dark:hover:bg-white/10 transition-colors cursor-default"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* This course includes - two columns with icons (Udemy-style) */}
          {includes && (
            <section className="mb-8">
              <h2 className="text-[1.25rem] font-bold text-[#1c1d1f] dark:text-white mb-4">This course includes:</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[0.9375rem] text-[#1c1d1f] dark:text-white">
                {includes.videoHours != null && (
                  <div className="flex items-center gap-3">
                    <i className="ti ti-video text-[1.25rem] text-[#5624d0] dark:text-primary shrink-0" />
                    <span>{includes.videoHours} hours on-demand video</span>
                  </div>
                )}
                {includes.codingExercises != null && includes.codingExercises > 0 && (
                  <div className="flex items-center gap-3">
                    <i className="ti ti-code text-[1.25rem] text-[#5624d0] dark:text-primary shrink-0" />
                    <span>{includes.codingExercises} coding exercises</span>
                  </div>
                )}
                {includes.assignments && (
                  <div className="flex items-center gap-3">
                    <i className="ti ti-clipboard-list text-[1.25rem] text-[#5624d0] dark:text-primary shrink-0" />
                    <span>Assignments</span>
                  </div>
                )}
                {includes.articles != null && includes.articles > 0 && (
                  <div className="flex items-center gap-3">
                    <i className="ti ti-file-text text-[1.25rem] text-[#5624d0] dark:text-primary shrink-0" />
                    <span>{includes.articles} articles</span>
                  </div>
                )}
                {includes.downloadableResources != null && includes.downloadableResources > 0 && (
                  <div className="flex items-center gap-3">
                    <i className="ti ti-download text-[1.25rem] text-[#5624d0] dark:text-primary shrink-0" />
                    <span>{includes.downloadableResources} downloadable resources</span>
                  </div>
                )}
                {includes.accessOnMobileAndTV && (
                  <div className="flex items-center gap-3">
                    <i className="ti ti-devices text-[1.25rem] text-[#5624d0] dark:text-primary shrink-0" />
                    <span>Access on mobile and TV</span>
                  </div>
                )}
                {includes.closedCaptions && (
                  <div className="flex items-center gap-3">
                    <i className="ti ti-subtask text-[1.25rem] text-[#5624d0] dark:text-primary shrink-0" />
                    <span>Closed captions</span>
                  </div>
                )}
                {includes.certificate && (
                  <div className="flex items-center gap-3">
                    <i className="ti ti-certificate text-[1.25rem] text-[#5624d0] dark:text-primary shrink-0" />
                    <span>Certificate of completion</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Coding exercises */}
          {codingDesc && (
            <section className="mb-8">
              <h2 className="text-[1.25rem] font-bold text-[#1c1d1f] dark:text-white mb-2">Coding exercises</h2>
              <p className="text-[0.9375rem] text-defaulttextcolor dark:text-white/90 mb-3 leading-relaxed">{codingDesc}</p>
              <button type="button" className="text-[0.9375rem] font-semibold text-primary hover:underline">
                See a demo
              </button>
            </section>
          )}

          {/* Course content accordion - sections/lectures from API (course.courseSections or course.lessons) */}
          {sections.length > 0 && totalLectures > 0 && (
            <section className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-[1.25rem] font-bold text-[#1c1d1f] dark:text-white">Course content</h2>
                <span className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60">
                  {totalLectures} lecture{totalLectures !== 1 ? "s" : ""} • {totalDuration}
                  {totalCompleted > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 ml-1">• {totalCompleted}/{totalLectures} completed</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExpandAllSections(!expandAll)}
                className="text-[0.8125rem] font-semibold text-primary hover:underline mb-3"
              >
                {expandAll ? "Collapse all sections" : "Expand all sections"}
              </button>
              <div className="border border-[#d1d7dc] dark:border-white/20 rounded overflow-hidden">
                {sections.map((sec) => {
                  const open = isExpanded(sec.id)
                  const secLectures = sec.lectures.length
                  const secCompleted = sec.lectures.filter((l) => l.isCompleted).length
                  const secDuration = sec.lectures.reduce((acc, l) => {
                    const d = l.duration
                    if (!d) return acc
                    let min = 0
                    const hrMatch = d.match(/(\d+)\s*hr/)
                    const minMatch = d.match(/(\d+)\s*min/)
                    if (hrMatch) min += parseInt(hrMatch[1], 10) * 60
                    if (minMatch) min += parseInt(minMatch[1], 10)
                    return acc + min
                  }, 0)
                  const durStr = secDuration >= 60 ? `${Math.floor(secDuration / 60)}hr ${secDuration % 60}min` : `${secDuration}min`
                  return (
                    <div key={sec.id} className="border-b border-[#d1d7dc] dark:border-white/20 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleSection(sec.id)}
                        className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left bg-[#f7f9fa] dark:bg-white/5 hover:bg-[#ebebeb] dark:hover:bg-white/10 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <i className={`ti ti-chevron-${open ? "down" : "right"} text-[1rem] text-[#6a6f73] dark:text-white/60`} />
                          <span className="font-semibold text-[0.9375rem] text-defaulttextcolor dark:text-white">{sec.title}</span>
                        </span>
                        <span className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60 shrink-0">
                          {secLectures} lecture{secLectures !== 1 ? "s" : ""} • {durStr}
                          {secCompleted > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400"> • {secCompleted}/{secLectures} done</span>
                          )}
                        </span>
                      </button>
                      {open && (
                        <ul className="bg-bodybg dark:bg-black/20 py-1">
                          {sec.lectures.map((lec, i) => (
                            <li key={lec.id} className="flex items-center justify-between gap-4 px-4 pl-10 py-2.5 text-[0.875rem] text-defaulttextcolor dark:text-white border-t border-[#e4e8eb] dark:border-white/10">
                              <span className="flex items-center gap-2 min-w-0">
                                {lec.isCompleted ? (
                                  <i className="ti ti-circle-check-filled text-[0.875rem] text-emerald-600 dark:text-emerald-400 shrink-0" aria-label="Completed" />
                                ) : (
                                  <i className="ti ti-player-play text-[0.75rem] text-[#6a6f73] dark:text-white/50 shrink-0" />
                                )}
                                <span className="truncate">{lec.title}</span>
                              </span>
                              <span className="flex items-center gap-2 shrink-0">
                                {lec.isCompleted && (
                                  <span className="text-[0.75rem] font-medium text-emerald-600 dark:text-emerald-400">Completed</span>
                                )}
                                {lec.duration && <span className="text-[0.8125rem] text-[#6a6f73] dark:text-white/50">{lec.duration}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Requirements */}
          {requirements.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[1.25rem] font-bold text-[#1c1d1f] dark:text-white mb-4">Requirements</h2>
              <ul className="list-disc pl-5 space-y-2 text-[0.9375rem] text-defaulttextcolor dark:text-white leading-relaxed">
                {requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </section>
          )}

        </div>

        {/* Right: sidebar - preview + CTA only (no buy/cart like reference) */}
        <aside className="lg:w-[384px] shrink-0">
          <div className="sticky top-6 rounded-lg overflow-hidden border border-[#d1d7dc] dark:border-white/10 bg-white dark:bg-[#1c1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <div className="relative w-full aspect-video bg-[#1c1d1f] dark:bg-black/40">
              <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors cursor-pointer">
                <span className="w-14 h-14 rounded-full border-2 border-white bg-white flex items-center justify-center text-[#1c1d1f] shadow-lg">
                  <i className="ti ti-player-play text-[1.75rem] ml-0.5" />
                </span>
              </div>
            </div>
            <div className="p-4 border-t border-[#d1d7dc] dark:border-white/10">
              <button type="button" className="text-[0.875rem] font-medium text-[#5624d0] dark:text-primary hover:underline mb-4 block">
                Preview this course
              </button>
              <Link
                href={`/courses/${course.id}/learn/`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5624d0] dark:bg-primary py-3.5 px-4 text-[1rem] font-bold text-white hover:bg-[#4a1fa8] dark:hover:opacity-90 transition-colors"
              >
                {course.progress === 0 ? (
                  <>
                    <i className="ti ti-player-play text-[1.25rem]" />
                    Start Course
                  </>
                ) : (
                  <>
                    <i className="ti ti-arrow-right text-[1.25rem]" />
                    Continue Learning
                  </>
                )}
              </Link>
              <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/50 mt-3 text-center">
                Full access included. No purchase required.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </Fragment>
  )
}
