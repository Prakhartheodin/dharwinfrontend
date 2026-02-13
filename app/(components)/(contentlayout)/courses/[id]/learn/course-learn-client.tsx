"use client"

/**
 * Course learn page (after course has started).
 *
 * Static data (courses-data.ts): Course.title, Course.courseSections[], Course.lessons[].
 *
 * Backend training curriculum (GET /v1/training/modules/:moduleId) – use these exact fields when fetching:
 *   TrainingModule:
 *     - id, moduleName, shortDescription, coverImage, status, createdAt, updatedAt
 *     - categories[], students[], mentorsAssigned[]
 *     - playlist[]  (curriculum items; order = playlist[].order or array index)
 *   PlaylistItem (each playlist[] element):
 *     - _id / id, contentType, title, duration (number, minutes), order
 *     - contentType enum: 'upload-video' | 'youtube-link' | 'pdf-document' | 'blog' | 'quiz' | 'test'
 *     - videoFile: { url, key, originalName, ... }  (for upload-video)
 *     - youtubeUrl  (for youtube-link)
 *     - pdfDocument: { url, key, ... }  (for pdf-document)
 *     - blogContent  (for blog)
 *     - quiz: { questions: [{ questionText, allowMultipleAnswers, options: [{ text, isCorrect }] }] }  (for quiz)
 *     - testLinkOrReference  (for test)
 * See: shared/lib/api/training-modules.ts (TrainingModule, PlaylistItem), backend trainingModule.model.js
 */
import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useState, useMemo } from "react"
import Link from "next/link"
import type { Course, CourseSection, CourseLesson } from "@/shared/data/training/courses-data"

function sectionDurationMin(lectures: CourseLesson[]): number {
  let total = 0
  lectures.forEach((l) => {
    const d = l.duration
    if (!d) return
    const hr = d.match(/(\d+)\s*hr/)
    const min = d.match(/(\d+)\s*min/)
    if (hr) total += parseInt(hr[1], 10) * 60
    if (min) total += parseInt(min[1], 10)
  })
  return total
}

function formatDuration(min: number): string {
  if (min >= 60) return `${Math.floor(min / 60)}hr ${min % 60}min`
  return `${min}min`
}

export default function CourseLearnClient({ course }: { course: Course }) {
  const [currentLectureId, setCurrentLectureId] = useState<string | null>(null)
  const [mainTab, setMainTab] = useState<"overview" | "qa" | "notes" | "announcements" | "reviews" | "tools">("overview")
  const [scheduleDismissed, setScheduleDismissed] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  const sections: CourseSection[] = useMemo(() => {
    if (course.courseSections?.length) return course.courseSections
    if (course.lessons?.length) {
      return [{ id: "default", title: "Course content", lectures: course.lessons }]
    }
    return []
  }, [course.courseSections, course.lessons])

  const firstSectionId = sections[0]?.id ?? null
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => (firstSectionId ? new Set([firstSectionId]) : new Set()))

  const totalLectures = useMemo(() => sections.reduce((acc, s) => acc + s.lectures.length, 0), [sections])
  const totalMinutes = useMemo(
    () => sections.reduce((acc, s) => acc + sectionDurationMin(s.lectures), 0),
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

  return (
    <Fragment>
      <Seo title={`${course.title} - Learn`} />

      {/* Top bar: course title, Your progress, Share, More */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-14 px-4 lg:px-6 border-b border-[#d1d7dc] dark:border-white/10 bg-white dark:bg-[#1c1d1f]">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/courses/" className="text-[#5624d0] dark:text-primary shrink-0 font-bold text-[0.9375rem] hidden sm:block">
            Courses
          </Link>
          <span className="text-[#6a6f73] dark:text-white/50 hidden sm:inline">/</span>
          <h1 className="truncate text-[0.9375rem] font-semibold text-[#1c1d1f] dark:text-white">
            {course.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" className="flex items-center gap-1.5 px-3 py-2 rounded text-[0.8125rem] font-medium text-[#1c1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/10">
            Your progress <i className="ti ti-chevron-down text-[0.75rem]" />
          </button>
          <button type="button" className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#1c1d1f] dark:text-white" aria-label="Share">
            <i className="ti ti-share text-[1.125rem]" />
          </button>
          <button type="button" className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#1c1d1f] dark:text-white" aria-label="More options">
            <i className="ti ti-dots-vertical text-[1.125rem]" />
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
        {/* Left: video + tabs + main body (this content scrolls the page; sidebar stays fixed) */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#000] dark:bg-black">
          {/* Video area */}
          <div className="relative w-full aspect-video bg-[#1c1d1f] dark:bg-black">
            <div className="absolute inset-0 flex items-center justify-center bg-[#1c1d1f]">
              <div className="text-center text-white/90 px-4">
                <p className="text-[1.25rem] font-semibold mb-4">What you&apos;ll learn in this course</p>
                <button type="button" className="w-16 h-16 rounded-full border-2 border-white bg-white/10 flex items-center justify-center mx-auto hover:bg-white/20 transition-colors">
                  <i className="ti ti-player-play text-[2rem] ml-1" />
                </button>
              </div>
            </div>
            {/* Video controls bar (placeholder) */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-black/70 flex items-center justify-between px-3 text-white text-[0.75rem]">
              <div className="flex items-center gap-2">
                <button type="button" className="p-1"><i className="ti ti-player-play" /></button>
                <button type="button" className="p-1"><i className="ti ti-rewind-back-5" /></button>
                <span className="opacity-80">1x</span>
              </div>
              <div className="flex-1 mx-2 h-1 bg-white/30 rounded-full max-w-[200px]" />
              <div className="flex items-center gap-1">
                <button type="button" className="p-1"><i className="ti ti-subtask" /></button>
                <button type="button" className="p-1"><i className="ti ti-settings" /></button>
                <button type="button" className="p-1"><i className="ti ti-maximize" /></button>
              </div>
            </div>
          </div>

          {/* Tabs: search + Overview, Q&A, Notes, Announcements, Reviews, Learning tools */}
          <nav className="flex items-center gap-2 border-b border-[#d1d7dc] dark:border-white/10 bg-white dark:bg-[#1c1d1f] px-4 overflow-x-auto">
            <button type="button" className="shrink-0 p-3 text-[#6a6f73] dark:text-white/60 hover:text-[#1c1d1f] dark:hover:text-white" aria-label="Search">
              <i className="ti ti-search text-[1.125rem]" />
            </button>
            <button type="button" className="shrink-0 py-3 px-2 text-[0.8125rem] font-semibold border-b-2 transition-colors -mb-px"
              onClick={() => setMainTab("overview")}
              style={mainTab === "overview" ? { color: "#1c1d1f", borderColor: "#1c1d1f" } : { color: "#6a6f73", borderColor: "transparent" }}
            >
              Overview
            </button>
            {(["qa", "notes", "announcements", "reviews", "tools"] as const).map((tab) => (
              <button key={tab} type="button" className="shrink-0 py-3 px-2 text-[0.8125rem] font-medium text-[#6a6f73] dark:text-white/70 border-b-2 border-transparent hover:text-[#1c1d1f] dark:hover:text-white -mb-px"
                onClick={() => setMainTab(tab)}
              >
                {tab === "qa" ? "Q&A" : tab === "notes" ? "Notes" : tab === "announcements" ? "Announcements" : tab === "reviews" ? "Reviews" : "Learning tools"}
              </button>
            ))}
          </nav>

          {/* Tab content - Overview */}
          <div className="flex-1 overflow-auto bg-white dark:bg-bodybg">
            {mainTab === "overview" && (
              <div className="max-w-[720px] mx-auto py-8 px-6">
                <h2 className="text-[1.5rem] font-bold text-[#1c1d1f] dark:text-white mb-4 leading-snug">{course.title}</h2>
                {/* Stat blocks: number on top, label below (Rating optional; Students + Total) */}
                <div className="flex flex-wrap gap-8 mb-3">
                  {course.ratingDisplay != null && (
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">{course.ratingDisplay}</span>
                        <i className="ti ti-star-filled text-[#e59819] text-[0.875rem]" />
                      </div>
                      {course.ratingCount != null && (
                        <button type="button" className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60 hover:text-[#1a73e8] hover:underline block mt-0.5">
                          {course.ratingCount.toLocaleString()} ratings
                        </button>
                      )}
                    </div>
                  )}
                  {course.learnerCount != null && (
                    <div>
                      <div className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">{course.learnerCount.toLocaleString()}</div>
                      <div className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60 mt-0.5">Students</div>
                    </div>
                  )}
                  <div>
                    <div className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">
                      {totalMinutes >= 60 ? (totalMinutes / 60).toFixed(1) : totalMinutes} hours
                    </div>
                    <div className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60 mt-0.5">Total</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[0.8125rem] text-[#6a6f73] dark:text-white/60 mb-6">
                  {course.lastUpdated && (
                    <span className="flex items-center gap-1.5">
                      <i className="ti ti-clock text-[0.875rem]" aria-hidden />
                      Last updated {course.lastUpdated}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <i className="ti ti-world text-[0.875rem]" aria-hidden />
                    English
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="ti ti-message-circle text-[0.875rem]" aria-hidden />
                    English [Auto]
                  </span>
                </div>

                {!scheduleDismissed && (
                  <div className="rounded-lg border border-[#d1d7dc] dark:border-white/10 bg-[#f7f9fa] dark:bg-white/5 p-5 mb-8">
                    <div className="flex gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-full bg-[#e5e7eb] dark:bg-white/10 flex items-center justify-center">
                        <i className="ti ti-clock text-[#6a6f73] dark:text-white/70 text-[1.5rem]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[1rem] text-[#1c1d1f] dark:text-white mb-2">Schedule learning time</h3>
                        <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/70 leading-relaxed mb-4">
                          Learning a little each day adds up. Research shows that students who make learning a habit are more likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.
                        </p>
                        <div className="flex items-center gap-4">
                          <button type="button" className="px-4 py-2.5 rounded border-2 border-[#5624d0] dark:border-primary text-[#5624d0] dark:text-primary text-[0.875rem] font-semibold bg-white dark:bg-transparent hover:bg-[#5624d0]/5 dark:hover:bg-primary/10">
                            Get started
                          </button>
                          <button type="button" onClick={() => setScheduleDismissed(true)} className="text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white hover:underline">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <h3 className="text-[1rem] font-bold text-[#1c1d1f] dark:text-white mb-3">By the numbers</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-[0.875rem] text-[#1c1d1f] dark:text-white mb-8 max-w-md">
                  <span className="text-[#6a6f73] dark:text-white/60">Skill level:</span>
                  <span>All Levels</span>
                  <span className="text-[#6a6f73] dark:text-white/60">Students:</span>
                  <span>{course.learnerCount?.toLocaleString() ?? "—"}</span>
                  <span className="text-[#6a6f73] dark:text-white/60">Languages:</span>
                  <span>English</span>
                  <span className="text-[#6a6f73] dark:text-white/60">Captions:</span>
                  <span>Yes</span>
                  <span className="text-[#6a6f73] dark:text-white/60">Lectures:</span>
                  <span>{totalLectures}</span>
                  <span className="text-[#6a6f73] dark:text-white/60">Video:</span>
                  <span>{totalMinutes >= 60 ? (totalMinutes / 60).toFixed(1) : totalMinutes} total hours</span>
                </div>

                <h3 className="text-[1rem] font-bold text-[#1c1d1f] dark:text-white mb-2">Description</h3>
                <p className="text-[0.875rem] text-[#1c1d1f] dark:text-white leading-relaxed">
                  {descriptionExpanded ? course.description : course.description.slice(0, 200) + (course.description.length > 200 ? "..." : "")}
                </p>
                {course.description.length > 200 && (
                  <button type="button" onClick={() => setDescriptionExpanded(!descriptionExpanded)} className="mt-2 text-[0.875rem] font-medium text-[#1a73e8] hover:underline flex items-center gap-1">
                    {descriptionExpanded ? "Show less" : "Show more"} <i className={`ti ti-chevron-${descriptionExpanded ? "up" : "down"} text-[0.75rem]`} />
                  </button>
                )}
              </div>
            )}
            {mainTab !== "overview" && (
              <div className="max-w-[720px] mx-auto py-8 px-4 text-center text-[#6a6f73] dark:text-white/60 text-[0.875rem]">
                {mainTab === "qa" && "No questions yet. Ask the instructor or other learners."}
                {mainTab === "notes" && "Your notes will appear here when you add them during lectures."}
                {mainTab === "announcements" && "No announcements."}
                {mainTab === "reviews" && "Reviews will be visible here."}
                {mainTab === "tools" && "Learning tools and resources."}
              </div>
            )}
          </div>
        </div>

        {/* Right: Course content - fixed on desktop (Udemy-style), only main body scrolls */}
        <aside className="w-full lg:w-[360px] shrink-0 lg:sticky lg:top-14 lg:self-start lg:h-[calc(100vh-3.5rem)] lg:max-h-[calc(100vh-3.5rem)] bg-[#1c1d1f] dark:bg-[#0d0d0d] border-l border-white/10 flex flex-col max-h-[60vh] lg:overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 p-2">
            <span className="px-3 py-2 text-[0.8125rem] font-semibold text-white">Course content</span>
            <div className="flex items-center gap-1">
              <button type="button" className="p-2 text-white/60 hover:text-white" aria-label="Expand"><i className="ti ti-arrows-maximize" /></button>
              <button type="button" className="p-2 text-white/60 hover:text-white" aria-label="Close"><i className="ti ti-x" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="py-2">
                {sections.map((section, idx) => {
                  const isExpanded = expandedSections.has(section.id)
                  const completed = 0
                  const total = section.lectures.length
                  const durMin = sectionDurationMin(section.lectures)
                  return (
                    <div key={section.id} className="border-b border-white/10 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/5"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <i className={`ti ti-chevron-${isExpanded ? "down" : "right"} text-white/60 text-[0.875rem] shrink-0`} />
                          <span className="text-[0.8125rem] font-medium text-white truncate">
                            Section {idx + 1}: {section.title}
                          </span>
                        </span>
                        <span className="text-[0.75rem] text-white/50 shrink-0">{completed}/{total} | {formatDuration(durMin)}</span>
                      </button>
                      {isExpanded && (
                        <ul className="bg-black/20">
                          {section.lectures.map((lecture, lidx) => {
                            const isActive = currentLectureId === lecture.id
                            return (
                              <li key={lecture.id}>
                                <button
                                  type="button"
                                  onClick={() => setCurrentLectureId(lecture.id)}
                                  className={`w-full flex items-center gap-3 px-4 pl-10 py-2.5 text-left text-[0.8125rem] ${isActive ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"}`}
                                >
                                  <i className="ti ti-circle text-[0.75rem] text-white/50 shrink-0" />
                                  <i className="ti ti-video text-[0.75rem] text-white/50 shrink-0" />
                                  <span className="truncate flex-1">{lidx + 1}. {lecture.title}</span>
                                  {lecture.duration && <span className="text-white/50 shrink-0">{lecture.duration}</span>}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        </aside>
      </div>
    </Fragment>
  )
}
