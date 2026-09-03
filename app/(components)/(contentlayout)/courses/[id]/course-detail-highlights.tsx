"use client"

import React from "react"
import type { IncludeTile } from "./course-detail-helpers"

/**
 * “What you’ll learn” card. One item spans the full width; two+ fill both columns.
 */
export function CourseLearnOutcomes({ points }: { points: string[] }) {
  if (points.length === 0) return null
  const fullWidth = points.length === 1

  return (
    <section className="rounded-2xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 sm:p-6 shadow-sm">
      <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white mb-4">What you&apos;ll learn</h2>
      <ul
        className={
          fullWidth
            ? "list-none p-0 m-0"
            : "list-none p-0 m-0 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3"
        }
      >
        {points.map((point, i) => (
          <li
            key={i}
            className="flex gap-3 min-w-0 text-[0.9375rem] text-[#1c1d1f] dark:text-white leading-[1.7]"
          >
            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5" aria-hidden>
              <i className="ti ti-check text-[0.875rem]" />
            </span>
            <span className="min-w-0 flex-1 text-pretty">{point}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Icon tiles for course includes.
 */
export function CourseIncludesGrid({ tiles }: { tiles: IncludeTile[] }) {
  if (tiles.length === 0) return null
  return (
    <section className="rounded-2xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 sm:p-6 shadow-sm">
      <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white mb-4">This course includes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex items-center gap-3 rounded-xl bg-[#f7f9fa] dark:bg-white/[0.04] border border-transparent dark:border-white/5 px-3.5 py-3 min-h-11"
          >
            <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden>
              <i className={`ti ${tile.icon} text-[1.0625rem]`} />
            </span>
            <span className="text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white">{tile.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Requirements list in a card.
 */
export function CourseRequirements({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <section className="rounded-2xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 sm:p-6 shadow-sm">
      <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white mb-4">Requirements</h2>
      <ul className="space-y-2.5">
        {items.map((req) => (
          <li key={req} className="flex gap-3 text-[0.9375rem] text-[#1c1d1f] dark:text-white leading-relaxed">
            <i className="ti ti-point-filled text-primary shrink-0 mt-1 text-[0.75rem]" aria-hidden />
            <span>{req}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Related topic chips.
 */
export function CourseRelatedTopics({ topics }: { topics: string[] }) {
  if (topics.length === 0) return null
  return (
    <section>
      <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white mb-3">Related topics</h2>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <span
            key={topic}
            className="inline-flex items-center min-h-11 px-4 rounded-full bg-[#f7f9fa] dark:bg-white/5 border border-[#e4e8eb] dark:border-white/15 text-[0.8125rem] font-medium text-[#1c1d1f] dark:text-white"
          >
            {topic}
          </span>
        ))}
      </div>
    </section>
  )
}

/**
 * Optional coding-exercises blurb with jump to curriculum.
 */
export function CourseCodingBlurb({ description }: { description: string }) {
  return (
    <section className="rounded-2xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 sm:p-6 shadow-sm">
      <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white mb-2">Coding exercises</h2>
      <p className="text-[0.9375rem] text-[#1c1d1f] dark:text-white/90 leading-relaxed">{description}</p>
      <a
        href="#course-content"
        className="inline-flex items-center gap-1 mt-3 min-h-11 text-[0.875rem] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
      >
        View in course content <i className="ti ti-arrow-down" aria-hidden />
      </a>
    </section>
  )
}
