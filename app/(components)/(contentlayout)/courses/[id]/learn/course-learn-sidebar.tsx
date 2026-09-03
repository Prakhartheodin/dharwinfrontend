"use client"

import React from "react"
import type { CourseSection } from "@/shared/data/training/courses-data"
import type { PlaylistItemForLearn } from "@/shared/lib/api/student-courses"
import { buildLockedItemIds, formatDuration, QUIZ_LOCKED_MESSAGE, sectionDurationMin } from "./course-learn-helpers"
import { learnItemLockState } from "./course-learn-wayfinding"

interface Props {
  sections: CourseSection[]
  playlistItems: PlaylistItemForLearn[]
  currentLectureId: string | null
  expandedSections: Set<string>
  sidebarHidden: boolean
  sidebarWide: boolean
  onToggleSection: (id: string) => void
  onSelectLecture: (id: string) => void
  onClose: () => void
  onToggleWide: () => void
}

/**
 * Icon class for a playlist item content type.
 */
function lectureTypeIcon(contentType: string | undefined): string {
  if (contentType === "quiz") return "ti-questionnaire"
  if (contentType === "blog") return "ti-article"
  if (contentType === "pdf-document") return "ti-file-text"
  if (contentType === "essay") return "ti-edit"
  return "ti-video"
}

export function CourseLearnSidebar({
  sections, playlistItems, currentLectureId, expandedSections, sidebarHidden, sidebarWide,
  onToggleSection, onSelectLecture, onClose, onToggleWide,
}: Props) {
  const lockedIds = React.useMemo(
    () => buildLockedItemIds(sections, playlistItems),
    [sections, playlistItems],
  )
  if (sidebarHidden) return null

  return (
    <aside
      className={`w-full ${sidebarWide ? "lg:w-[480px]" : "lg:w-[360px]"} shrink-0 lg:sticky lg:top-14 lg:self-start lg:h-[calc(100vh-3.5rem)] lg:max-h-[calc(100vh-3.5rem)] bg-[#1c1d1f] dark:bg-[#0d0d0d] border-l border-white/10 flex flex-col max-h-[60vh] lg:overflow-hidden transition-[width] duration-200 ease-out`}
      aria-label="Course playlist"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-2 py-1.5">
        <span className="px-3 py-2 text-[0.8125rem] font-semibold tracking-tight text-white">Course content</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleWide}
            className="hidden lg:inline-flex w-11 h-11 items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label={sidebarWide ? "Minimize course content" : "Maximize course content"}
            aria-pressed={sidebarWide}
          >
            <i className={`ti ti-arrows-${sidebarWide ? "minimize" : "maximize"}`} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex w-11 h-11 items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Close course content"
          >
            <i className="ti ti-x" aria-hidden />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {sections.length === 0 && (
          <p className="px-4 py-8 text-center text-[0.8125rem] text-white/50">No sections yet.</p>
        )}
        {sections.map((section, idx) => {
          const isExpanded = expandedSections.has(section.id)
          const total = section.lectures.length
          const completed = section.lectures.filter((lec) => playlistItems.find((p) => p.id === lec.id)?.isCompleted).length
          const durMin = sectionDurationMin(section.lectures)
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0
          return (
            <div key={section.id} className="border-b border-white/10 last:border-b-0">
              <button
                type="button"
                onClick={() => onToggleSection(section.id)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30"
                aria-expanded={isExpanded}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <i className={`ti ti-chevron-${isExpanded ? "down" : "right"} text-white/60 text-[0.875rem] shrink-0 transition-transform duration-200`} aria-hidden />
                  <span className="text-[0.8125rem] font-medium text-white truncate">Section {idx + 1}: {section.title}</span>
                </span>
                <span className="text-[0.75rem] text-white/50 shrink-0 tabular-nums">{completed}/{total} · {formatDuration(durMin)}</span>
              </button>
              <div className="mx-4 mb-2 h-0.5 rounded-full bg-white/10 overflow-hidden" aria-hidden>
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
              {isExpanded && (
                <ul className="bg-black/20 pb-1">
                  {section.lectures.map((lecture, lidx) => {
                    const isActive = currentLectureId === lecture.id
                    const item = playlistItems.find((p) => p.id === lecture.id)
                    const done = item?.isCompleted
                    const lock = learnItemLockState(item, false, QUIZ_LOCKED_MESSAGE, lockedIds)
                    const icon = lectureTypeIcon(item?.contentType)
                    return (
                      <li key={lecture.id}>
                        <button
                          type="button"
                          onClick={() => { if (!lock.locked) onSelectLecture(lecture.id) }}
                          disabled={lock.locked}
                          aria-disabled={lock.locked || undefined}
                          aria-current={isActive && !lock.locked ? "true" : undefined}
                          title={lock.locked ? lock.message : undefined}
                          className={`w-full flex items-start gap-2.5 px-4 pl-9 py-2.5 text-left text-[0.8125rem] min-h-11 border-l-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 disabled:cursor-not-allowed ${
                            lock.locked
                              ? "border-transparent text-white/40 bg-white/[0.02]"
                              : isActive
                                ? "bg-primary/20 text-white border-primary"
                                : "border-transparent text-white/80 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {lock.locked
                            ? <i className="ti ti-lock text-[0.875rem] text-white/35 shrink-0 mt-0.5" aria-hidden />
                            : done
                              ? <i className="ti ti-circle-check text-[0.875rem] text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                              : <i className="ti ti-circle text-[0.875rem] text-white/40 shrink-0 mt-0.5" aria-hidden />}
                          <i className={`ti ${icon} text-[0.75rem] shrink-0 mt-0.5 ${lock.locked ? "text-white/30" : "text-white/45"}`} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate ${lock.locked ? "text-white/45" : ""}`}>
                              {isActive && !lock.locked && <span className="sr-only">Now playing: </span>}
                              {lidx + 1}. {lecture.title}
                            </span>
                            {lock.locked && (
                              <span className="block text-[0.6875rem] text-white/40 leading-snug mt-0.5">{lock.message}</span>
                            )}
                          </span>
                          {isActive && !lock.locked && (
                            <span className="shrink-0 text-[0.625rem] font-bold uppercase tracking-wide text-white bg-primary px-1.5 py-0.5 rounded">Now</span>
                          )}
                          {lecture.duration && !lock.locked && <span className="text-white/45 shrink-0 tabular-nums text-[0.75rem]">{lecture.duration}</span>}
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
    </aside>
  )
}
