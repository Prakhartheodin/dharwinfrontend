"use client"

import React from "react"
import type { CourseSection } from "@/shared/data/training/courses-data"
import { formatDurationLabel, sectionMinutes } from "./course-detail-helpers"

interface Props {
  sections: CourseSection[]
  totalLectures: number
  totalDuration: string
  totalCompleted: number
  expandAll: boolean
  expandedIds: Set<string>
  upNextId: string | null
  onToggleSection: (id: string) => void
  onSetExpandAll: (open: boolean) => void
}

/**
 * Designed curriculum accordion with completed / up-next states.
 */
export function CourseDetailCurriculum({
  sections,
  totalLectures,
  totalDuration,
  totalCompleted,
  expandAll,
  expandedIds,
  upNextId,
  onToggleSection,
  onSetExpandAll,
}: Props) {
  const isOpen = (id: string) => expandAll || expandedIds.has(id)

  return (
    <section id="course-content" className="rounded-2xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03] overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-5 border-b border-[#e4e8eb] dark:border-white/10">
        <div className="min-w-0">
          <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">Course content</h2>
          <p className="text-[0.8125rem] text-[#6a6f73] dark:text-white/55 mt-0.5">
            {sections.length} sections · {totalLectures} lectures · {totalDuration}
            {totalCompleted > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400"> · {totalCompleted}/{totalLectures} completed</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSetExpandAll(!expandAll)}
          className="ti-btn ti-btn-outline-primary min-h-11 shrink-0 self-start sm:self-auto"
          aria-expanded={expandAll}
        >
          {expandAll ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div>
        {sections.map((sec, idx) => {
          const open = isOpen(sec.id)
          const count = sec.lectures.length
          const done = sec.lectures.filter((l) => l.isCompleted).length
          const pct = count > 0 ? Math.round((done / count) * 100) : 0
          const durStr = formatDurationLabel(sectionMinutes(sec.lectures))
          return (
            <div key={sec.id} className="border-b border-[#e4e8eb] dark:border-white/10 last:border-b-0">
              <button
                type="button"
                onClick={() => onToggleSection(sec.id)}
                className="w-full flex items-center justify-between gap-3 px-5 sm:px-6 py-4 text-left min-h-14 hover:bg-[#f7f9fa] dark:hover:bg-white/[0.04] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                aria-expanded={open}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <i className={`ti ti-chevron-${open ? "down" : "right"} text-[#6a6f73] shrink-0 transition-transform duration-200`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block font-semibold text-[0.9375rem] text-[#1c1d1f] dark:text-white truncate">
                      {idx + 1}. {sec.title}
                    </span>
                    <span className="block text-[0.75rem] text-[#6a6f73] dark:text-white/50 mt-0.5">
                      {done}/{count} · {durStr}
                    </span>
                  </span>
                </span>
                <span className="hidden sm:block w-20 h-1.5 rounded-full bg-[#e4e8eb] dark:bg-white/10 overflow-hidden shrink-0" aria-hidden>
                  <span className="block h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
                </span>
              </button>
              {open && (
                <ul className="bg-[#f7f9fa] dark:bg-black/20 pb-2">
                  {sec.lectures.map((lec) => {
                    const isNext = lec.id === upNextId
                    return (
                      <li
                        key={lec.id}
                        className={`flex items-center justify-between gap-3 px-5 sm:px-6 pl-12 sm:pl-14 py-2.5 min-h-11 text-[0.875rem] ${
                          isNext ? "bg-primary/5" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          {lec.isCompleted ? (
                            <i className="ti ti-circle-check text-emerald-500 shrink-0 text-[1rem]" aria-label="Completed" />
                          ) : (
                            <i className="ti ti-circle text-[#6a6f73] dark:text-white/40 shrink-0 text-[1rem]" aria-hidden />
                          )}
                          <span className={`truncate ${lec.isCompleted ? "text-[#6a6f73] dark:text-white/55" : "text-[#1c1d1f] dark:text-white"}`}>
                            {lec.title}
                          </span>
                          {isNext && (
                            <span className="shrink-0 text-[0.625rem] font-bold uppercase tracking-wide text-white bg-primary px-1.5 py-0.5 rounded">
                              Up next
                            </span>
                          )}
                        </span>
                        {lec.duration && (
                          <span className="text-[0.75rem] text-[#6a6f73] dark:text-white/45 tabular-nums shrink-0">{lec.duration}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
