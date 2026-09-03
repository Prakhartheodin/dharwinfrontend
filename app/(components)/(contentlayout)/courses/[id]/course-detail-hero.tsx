"use client"

import React from "react"
import Link from "next/link"
import type { Course } from "@/shared/data/training/courses-data"

interface Props {
  course: Course
  totalLectures: number
  totalDuration: string
  learnHref: string
}

/**
 * Premium hero: cover, title, instructor, stats, progress, and primary CTA.
 */
export function CourseDetailHero({ course, totalLectures, totalDuration, learnHref }: Props) {
  const progress = Math.min(100, Math.max(0, course.progress ?? 0))
  const ctaLabel = progress === 0 ? "Start learning" : "Continue learning"
  const ctaIcon = progress === 0 ? "ti-player-play" : "ti-arrow-right"
  const taglineLooksTruncated = !!course.tagline && /(\u2026|\.\.\.)$/.test(course.tagline.trim())
  const blurb = taglineLooksTruncated
    ? (course.description || course.tagline)
    : (course.tagline || course.description)

  return (
    <header className="rounded-2xl overflow-hidden border border-[#e4e8eb] dark:border-white/10 bg-[#1c1d1f] text-white shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,38%)]">
        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10 min-w-0">
          {course.badges && course.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {course.badges.map((badge) => (
                <span
                  key={badge}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${
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
          <h1 className="text-[1.75rem] sm:text-[2rem] font-bold leading-tight tracking-tight text-pretty">
            {course.title}
          </h1>
          {blurb && (
            <p className="mt-3 text-[0.9375rem] sm:text-[1rem] text-white/75 leading-relaxed text-pretty">
              {blurb}
            </p>
          )}
          <p className="mt-4 text-[0.875rem] text-white/70">
            Created by <span className="font-medium text-white">{course.instructor}</span>
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-white/70">
            {course.ratingDisplay != null && (
              <span className="inline-flex items-center gap-1.5">
                <span className="font-bold text-white">{course.ratingDisplay}</span>
                <span className="flex text-[#e59819]" aria-hidden>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i key={i} className={`ti ${i <= Math.round(course.ratingDisplay!) ? "ti-star-filled" : "ti-star"} text-[0.875rem]`} />
                  ))}
                </span>
                {course.ratingCount != null && (
                  <span>({course.ratingCount.toLocaleString()} ratings)</span>
                )}
              </span>
            )}
            {course.learnerCount != null && (
              <span className="inline-flex items-center gap-1.5">
                <i className="ti ti-users" aria-hidden />
                {course.learnerCount.toLocaleString()} learners
              </span>
            )}
            {course.lastUpdated && (
              <span className="inline-flex items-center gap-1.5">
                <i className="ti ti-calendar" aria-hidden />
                Updated {course.lastUpdated}
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[0.8125rem] font-medium">
              <i className="ti ti-clock" aria-hidden /> {totalDuration}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[0.8125rem] font-medium">
              <i className="ti ti-list-details" aria-hidden /> {totalLectures} lectures
            </span>
            {progress > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-200 px-3 py-1.5 text-[0.8125rem] font-medium">
                {progress}% complete
              </span>
            )}
          </div>

          {progress > 0 && (
            <div className="mt-4 max-w-md">
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress">
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
            <Link
              href={learnHref}
              className="ti-btn ti-btn-primary min-h-11 px-6 inline-flex items-center justify-center gap-2 font-semibold"
            >
              <i className={`ti ${ctaIcon}`} aria-hidden />
              {ctaLabel}
            </Link>
            <p className="text-[0.75rem] text-white/50 sm:ml-1">Full access included</p>
          </div>
        </div>

        <Link
          href={learnHref}
          className="relative block aspect-video lg:aspect-auto lg:h-full min-h-[220px] lg:min-h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70"
          aria-label={`${ctaLabel}: ${course.title}`}
        >
          <img
            src={course.thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" aria-hidden />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-16 h-16 rounded-full bg-white text-[#1c1d1f] flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
              <i className="ti ti-player-play text-[1.75rem] ml-0.5" aria-hidden />
            </span>
          </span>
        </Link>
      </div>
    </header>
  )
}
