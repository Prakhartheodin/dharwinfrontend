"use client"

import React from "react"
import type { Course } from "@/shared/data/training/courses-data"
import type { PlaylistItemForLearn } from "@/shared/lib/api/student-courses"
import { sanitizeRichHtml } from "@/shared/lib/sanitize-html"
import { descriptionParagraphs, type LearnTabId } from "./course-learn-helpers"
import { CompletionToggle } from "./course-learn-complete-toggle"
import { QuizRenderer } from "./course-learn-quiz"
import { EssayRenderer } from "./course-learn-essay"
import { LEARN_RECT_PRIMARY, LearnLockedEmpty, learnItemLockState } from "./course-learn-wayfinding"

interface OverviewProps {
  course: Course
  totalMinutes: number
  totalLectures: number
  scheduleDismissed: boolean
  savedScheduleLabel: string | null
  onGetStarted: () => void
  onDismissSchedule: () => void
  descriptionExpanded: boolean
  onToggleDescription: () => void
}

export function CourseLearnOverview({
  course, totalMinutes, totalLectures, scheduleDismissed, savedScheduleLabel,
  onGetStarted, onDismissSchedule, descriptionExpanded, onToggleDescription,
}: OverviewProps) {
  const paragraphs = descriptionParagraphs(course.description ?? "")
  const shown = descriptionExpanded ? paragraphs : paragraphs.slice(0, 1)

  return (
    <div className="max-w-[720px] mx-auto py-8 px-6">
      <h2 className="text-[1.5rem] font-bold text-[#1c1d1f] dark:text-white mb-4 leading-snug">{course.title}</h2>
      <div className="flex flex-wrap gap-8 mb-3">
        {course.ratingDisplay != null && (
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[1.125rem] font-bold">{course.ratingDisplay}</span>
              <i className="ti ti-star-filled text-[#e59819] text-[0.875rem]" />
            </div>
          </div>
        )}
        {course.learnerCount != null && (
          <div>
            <div className="text-[1.125rem] font-bold">{course.learnerCount.toLocaleString()}</div>
            <div className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60 mt-0.5">Learners</div>
          </div>
        )}
        <div>
          <div className="text-[1.125rem] font-bold">{totalMinutes >= 60 ? (totalMinutes / 60).toFixed(1) : totalMinutes} hours</div>
          <div className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60 mt-0.5">Total</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[0.8125rem] text-[#6a6f73] dark:text-white/60 mb-6">
        {course.lastUpdated && (
          <span className="flex items-center gap-1.5"><i className="ti ti-clock" aria-hidden /> Last updated {course.lastUpdated}</span>
        )}
        <span className="flex items-center gap-1.5"><i className="ti ti-world" aria-hidden /> English</span>
      </div>

      {!scheduleDismissed && (
        <div className="rounded-2xl border border-[#d1d7dc] dark:border-white/10 bg-[#f7f9fa] dark:bg-white/5 p-5 sm:p-6 mb-8 shadow-sm">
          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <i className="ti ti-calendar-event text-[1.5rem]" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[1rem] text-[#1c1d1f] dark:text-white mb-2">Schedule learning time</h3>
              <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/70 leading-relaxed mb-4">
                Learning a little each day adds up. Learners who make learning a habit are more likely to reach their goals. Set time aside and we&apos;ll keep a reminder on this device.
              </p>
              {savedScheduleLabel && (
                <p className="inline-flex items-center gap-1.5 text-[0.8125rem] text-emerald-700 dark:text-emerald-400 mb-3 font-medium">
                  <i className="ti ti-check" aria-hidden /> {savedScheduleLabel}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={onGetStarted} className="ti-btn ti-btn-primary min-h-11">
                  Get started
                </button>
                <button
                  type="button"
                  onClick={onDismissSchedule}
                  className="min-h-11 px-3 text-[0.875rem] font-medium text-[#6a6f73] hover:text-[#1c1d1f] dark:hover:text-white hover:underline rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-[1rem] font-bold mb-3">By the numbers</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-[0.875rem] mb-8 max-w-md">
        <span className="text-[#6a6f73] dark:text-white/60">Skill level:</span><span>All Levels</span>
        <span className="text-[#6a6f73] dark:text-white/60">Learners:</span><span>{course.learnerCount?.toLocaleString() ?? "—"}</span>
        <span className="text-[#6a6f73] dark:text-white/60">Languages:</span><span>English</span>
        <span className="text-[#6a6f73] dark:text-white/60">Captions:</span><span>Yes</span>
        <span className="text-[#6a6f73] dark:text-white/60">Lectures:</span><span>{totalLectures}</span>
        <span className="text-[#6a6f73] dark:text-white/60">Video:</span>
        <span>{totalMinutes >= 60 ? (totalMinutes / 60).toFixed(1) : totalMinutes} total hours</span>
      </div>

      <h3 className="text-[1rem] font-bold mb-2">Description</h3>
      <div className="space-y-3 text-[0.9375rem] text-[#1c1d1f] dark:text-white leading-[1.7] text-left text-pretty">
        {shown.map((p, i) => <p key={i} className="text-pretty">{p}</p>)}
      </div>
      {paragraphs.length > 1 && (
        <button type="button" onClick={onToggleDescription} className="mt-2 text-[0.875rem] font-medium text-primary hover:underline inline-flex items-center gap-1 min-h-11 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
          {descriptionExpanded ? "Show less" : "Show more"} <i className={`ti ti-chevron-${descriptionExpanded ? "up" : "down"} text-[0.75rem]`} aria-hidden />
        </button>
      )}
    </div>
  )
}

interface ItemListProps {
  items: PlaylistItemForLearn[]
  onSelect: (item: PlaylistItemForLearn) => void
  emptyLabel: string
  emptyIcon: string
  actionLabel: (item: PlaylistItemForLearn) => string
  actionIcon: string
  kind: LearnTabId
  onToggleComplete?: (item: PlaylistItemForLearn) => void
  completingId?: string | null
  activeId?: string | null
  /** Presentational: lock every row. Prefer per-item `locked` / `lockReason` or `lockedIds`. */
  locked?: boolean
  lockMessage?: string
  lockedIds?: ReadonlySet<string>
}

/**
 * Designed empty playlist for a content tab.
 */
function LearnTabEmpty({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-2xl border border-dashed border-[#d1d7dc] dark:border-white/15 bg-[#f7f9fa] dark:bg-white/[0.03]">
      <span className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3" aria-hidden>
        <i className={`ti ${icon} text-[1.5rem]`} />
      </span>
      <p className="text-[0.9375rem] font-medium text-[#1c1d1f] dark:text-white">{label}</p>
      <p className="text-[0.8125rem] text-[#6a6f73] dark:text-white/55 mt-1 max-w-xs">Pick another tab or a lesson from the playlist.</p>
    </div>
  )
}

export function CourseLearnItemList({ items, onSelect, emptyLabel, emptyIcon, actionLabel, actionIcon, kind, onToggleComplete, completingId, activeId, locked, lockMessage, lockedIds }: ItemListProps) {
  if (items.length === 0) {
    return <LearnTabEmpty icon={emptyIcon} label={emptyLabel} />
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const isActive = activeId === item.id
        const lock = learnItemLockState(item, locked, lockMessage, lockedIds)
        const isQuizAction = kind === "quiz"
        return (
        <li key={item.id}>
          <div
            role="button"
            tabIndex={lock.locked ? -1 : 0}
            aria-current={isActive ? "true" : undefined}
            aria-disabled={lock.locked || undefined}
            className={`group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 p-3.5 min-h-[5.75rem] rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1d1f]/40 ${
              lock.locked
                ? "cursor-not-allowed border-[#d1d7dc] bg-[#f7f9fa] dark:bg-white/[0.02] dark:border-white/10 opacity-80"
                : `cursor-pointer bg-white dark:bg-white/[0.03] hover:border-primary/30 hover:shadow-sm ${
                    isActive ? "border-primary ring-1 ring-primary/25 bg-primary/5" : "border-[#e4e8eb] dark:border-white/10"
                  }`
            }`}
            onClick={() => { if (!lock.locked) onSelect(item) }}
            onKeyDown={(e) => {
              if (lock.locked) return
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onSelect(item)
              }
            }}
          >
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${lock.locked ? "bg-[#1c1d1f]/8 text-[#6a6f73]" : "bg-primary/10"}`} aria-hidden>
              <i className={`ti ${lock.locked ? "ti-lock" : actionIcon} ${lock.locked ? "text-[#6a6f73]" : "text-primary"} text-[1.0625rem]`} />
            </span>
            <div className="min-w-0 self-center">
              <p className={`font-medium text-[0.875rem] truncate ${lock.locked ? "text-[#6a6f73] dark:text-white/50" : "text-[#1c1d1f] dark:text-white group-hover:text-primary"}`}>{item.title}</p>
              {lock.locked && (
                <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/50 leading-relaxed mt-1">{lock.message}</p>
              )}
              {!lock.locked && kind === "blog" && item.blogContent && (
                <p className="text-[0.8125rem] text-[#6a6f73] leading-relaxed line-clamp-2 mt-1">
                  {sanitizeRichHtml(item.blogContent).replace(/<[^>]+>/g, "").slice(0, 150)}
                </p>
              )}
              {!lock.locked && kind !== "blog" && (
                <p className="text-[0.75rem] text-[#6a6f73] mt-0.5">
                  {item.contentType === "youtube-link" ? "YouTube" : item.difficulty ?? item.duration ?? item.contentType}
                </p>
              )}
            </div>
            <div className="shrink-0 flex flex-col gap-2 items-stretch sm:items-end justify-center" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-end gap-2">
                {item.isCompleted && !lock.locked && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center" aria-label="Completed">
                    <i className="ti ti-check text-white text-[0.75rem]" aria-hidden />
                  </span>
                )}
                <button
                  type="button"
                  disabled={lock.locked}
                  aria-disabled={lock.locked || undefined}
                  className={isQuizAction || lock.locked
                    ? LEARN_RECT_PRIMARY
                    : "inline-flex items-center justify-center min-h-9 px-3.5 rounded-lg bg-primary text-white text-[0.8125rem] font-semibold hover:opacity-90 transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"}
                  onClick={(e) => { e.stopPropagation(); if (!lock.locked) onSelect(item) }}
                >
                  {actionLabel(item)}
                </button>
              </div>
              {kind === "blog" && onToggleComplete && (
                <CompletionToggle
                  isCompleted={!!item.isCompleted}
                  completing={completingId === item.id}
                  onComplete={() => onToggleComplete(item)}
                  onIncomplete={() => onToggleComplete(item)}
                  completeLabel="Mark as read"
                  incompleteLabel="Mark as unread"
                  compact
                />
              )}
            </div>
          </div>
        </li>
        )
      })}
    </ul>
  )
}

export function SelectedQuizPanel({
  item, studentId, moduleId, onProgressUpdate,
}: {
  item: PlaylistItemForLearn
  studentId: string
  moduleId: string
  onProgressUpdate: () => Promise<void>
}) {
  const lock = learnItemLockState(item)
  return (
    <div className="max-w-[720px] mx-auto py-6 px-6">
      <h2 className="text-[1.125rem] font-bold mb-4 leading-snug">{item.title}</h2>
      {lock.locked ? (
        <LearnLockedEmpty message={lock.message} />
      ) : (
        <QuizRenderer
          quiz={item.quiz}
          playlistItemId={item.id}
          studentId={studentId}
          moduleId={moduleId}
          isCompleted={item.isCompleted}
          onProgressUpdate={onProgressUpdate}
        />
      )}
    </div>
  )
}

export function SelectedEssayPanel({
  item, studentId, moduleId, playlistItems, onSelectItem, onProgressUpdate,
}: {
  item: PlaylistItemForLearn
  studentId: string
  moduleId: string
  playlistItems: PlaylistItemForLearn[]
  onSelectItem: (item: PlaylistItemForLearn) => void
  onProgressUpdate: () => Promise<void>
}) {
  return (
    <div className="max-w-[720px] mx-auto py-6 px-6">
      <h2 className="text-[1.125rem] font-bold mb-1 leading-snug">{item.title}</h2>
      <p className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60 mb-4">Current Q&A in course sequence</p>
      <EssayRenderer
        essay={item.essay}
        playlistItemId={item.id}
        studentId={studentId}
        moduleId={moduleId}
        isCompleted={item.isCompleted}
        playlistItems={playlistItems}
        onSelectItem={onSelectItem}
        onProgressUpdate={onProgressUpdate}
      />
    </div>
  )
}

export function SelectedBlogPanel({
  item, completing, onComplete, onIncomplete, nextItem, onNext,
}: {
  item: PlaylistItemForLearn
  completing: boolean
  onComplete: () => void
  onIncomplete: () => void
  nextItem?: PlaylistItemForLearn | null
  onNext?: (item: PlaylistItemForLearn) => void
}) {
  return (
    <article className="max-w-[720px] mx-auto py-6 px-6" aria-labelledby="learn-article-title">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-primary mb-1 inline-flex items-center gap-1.5">
            <i className="ti ti-article" aria-hidden />
            Now reading
          </p>
          <h2 id="learn-article-title" className="text-[1.25rem] font-bold min-w-0 leading-snug">{item.title}</h2>
        </div>
        <CompletionToggle
          isCompleted={!!item.isCompleted}
          completing={completing}
          onComplete={onComplete}
          onIncomplete={onIncomplete}
          completeLabel="Mark as read"
          incompleteLabel="Mark as unread"
        />
      </div>
      {item.blogContent ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-left text-[0.9375rem] leading-[1.7] text-pretty prose-p:mb-4 prose-p:mt-0 prose-headings:mt-6 prose-headings:mb-2 prose-li:my-1"
          dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(item.blogContent) }}
        />
      ) : (
        <LearnTabEmpty icon="ti-article-off" label="No content available." />
      )}
      {nextItem && onNext && (
        <div className="mt-8 pt-5 border-t border-[#e4e8eb] dark:border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="min-w-0 flex-1 text-[0.875rem]">
            <span className="text-[#6a6f73] dark:text-white/55">Up next article · </span>
            <span className="font-semibold text-[#1c1d1f] dark:text-white">{nextItem.title}</span>
          </p>
          <button type="button" className="ti-btn ti-btn-primary min-h-11 shrink-0" onClick={() => onNext(nextItem)}>
            Next article
          </button>
        </div>
      )}
    </article>
  )
}
