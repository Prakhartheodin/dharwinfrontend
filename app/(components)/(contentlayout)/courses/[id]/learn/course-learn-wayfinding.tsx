"use client"

import React from "react"
import type { PlaylistItemForLearn } from "@/shared/lib/api/student-courses"
import { contentKindLabel, itemMatchesTab, tabBrowseOrientation, QUIZ_LOCKED_MESSAGE, type LearnTabId } from "./course-learn-helpers"
import { CompletionToggle } from "./course-learn-complete-toggle"

interface LearnTabDef {
  id: LearnTabId
  label: string
  icon: string
}

/**
 * Lesson-type tabs. Stays at the top of the learn column so Video/etc. open below it.
 */
export function LearnTypeTabs({
  tabs,
  activeId,
  counts,
  onSelect,
}: {
  tabs: LearnTabDef[]
  activeId: LearnTabId
  counts: Partial<Record<LearnTabId, number>>
  onSelect: (id: LearnTabId) => void
}) {
  return (
    <nav
      className="sticky top-14 z-20 flex items-center gap-1.5 border-b border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-[#1c1d1f] px-3 py-1.5 overflow-x-auto"
      aria-label="Lesson types"
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id
        const count = tab.id !== "overview" ? (counts[tab.id] ?? 0) : 0
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            aria-label={count > 0 ? `${tab.label}, ${count} items` : tab.label}
            className={`shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-sm text-[0.75rem] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1d1f]/40 dark:focus-visible:ring-white/40 ${
              isActive
                ? "bg-[#1c1d1f] text-white dark:bg-white dark:text-[#1c1d1f]"
                : "text-[#1c1d1f] dark:text-white border border-[#1c1d1f]/25 dark:border-white/25 hover:bg-[#1c1d1f] hover:text-white dark:hover:bg-white dark:hover:text-[#1c1d1f]"
            }`}
            onClick={() => onSelect(tab.id)}
          >
            <i className={`ti ${tab.icon} text-[0.8125rem]`} aria-hidden />
            {tab.label}
            {count > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[1.125rem] h-4 px-1 rounded-sm text-[0.625rem] font-semibold tabular-nums ${isActive ? "bg-white/20 dark:bg-[#1c1d1f]/15" : "bg-[#1c1d1f]/10 dark:bg-white/10"}`} aria-hidden>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

/**
 * Where-you-are strip. Follows the active tab — never a leftover video on Quizzes/Q&A.
 */
export function LearnOrientationBar({
  selected,
  mainTab,
  listBrowse,
  lessonIndex,
  total,
  completedCount,
}: {
  selected: PlaylistItemForLearn | null
  mainTab: LearnTabId
  listBrowse: boolean
  lessonIndex: number
  total: number
  completedCount: number
}) {
  const focused = Boolean(
    selected &&
    itemMatchesTab(selected, mainTab) &&
    (mainTab === "video" || !listBrowse)
  )

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 bg-white dark:bg-[#1c1d1f] border-b border-[#e4e8eb] dark:border-white/10 text-[0.8125rem]">
      <p className="min-w-0 text-[#1c1d1f] dark:text-white">
        {focused && selected ? (
          <>
            <span className="font-semibold">{contentKindLabel(selected.contentType)}</span>
            <span className="text-[#6a6f73] dark:text-white/60"> · {lessonIndex + 1} of {total}</span>
            <span className="text-[#6a6f73] dark:text-white/60"> · </span>
            <span className="font-medium truncate">{selected.title}</span>
          </>
        ) : (
          <span className="font-medium text-[#1c1d1f] dark:text-white">{tabBrowseOrientation(mainTab)}</span>
        )}
      </p>
      <span className="text-[#6a6f73] dark:text-white/60">{completedCount}/{total} done</span>
    </div>
  )
}

/**
 * Overview primary action: start or resume the next unfinished lesson.
 */
export function ContinueLearningBanner({
  item,
  isResume,
  onContinue,
}: {
  item: PlaylistItemForLearn
  isResume: boolean
  onContinue: () => void
}) {
  return (
    <div className="max-w-[720px] mx-auto px-6 pt-6">
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-primary">{isResume ? "Continue where you left off" : "Start learning"}</p>
          <p className="font-semibold text-[#1c1d1f] dark:text-white truncate">{item.title}</p>
          <p className="text-[0.8125rem] text-[#6a6f73]">{contentKindLabel(item.contentType)} · Use Course content on the right to jump around.</p>
        </div>
        <button type="button" className="ti-btn ti-btn-primary min-h-[44px] shrink-0" onClick={onContinue}>
          {isResume ? "Continue" : "Start this lesson"}
        </button>
      </div>
    </div>
  )
}

/**
 * After the current lesson: obvious next step (or course complete).
 */
export function NextLessonBar({
  next,
  onNext,
  isLast,
}: {
  next: PlaylistItemForLearn | null
  onNext: (item: PlaylistItemForLearn) => void
  isLast: boolean
}) {
  if (isLast) {
    return (
      <div className="px-4 py-3 bg-[#f7f9fa] dark:bg-white/5 border-t border-[#e4e8eb] dark:border-white/10">
        <p className="text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white">You&apos;ve reached the last lesson. Review anything from Course content, or go back to About this course.</p>
      </div>
    )
  }
  if (!next) return null
  return (
    <div className="px-4 py-3 bg-[#f7f9fa] dark:bg-white/5 border-t border-[#e4e8eb] dark:border-white/10 flex flex-col sm:flex-row sm:items-center gap-2">
      <p className="text-[0.875rem] min-w-0 flex-1">
        <span className="text-[#6a6f73]">Up next · {contentKindLabel(next.contentType)}: </span>
        <span className="font-semibold text-[#1c1d1f] dark:text-white">{next.title}</span>
      </p>
      <button type="button" className="ti-btn ti-btn-primary min-h-[40px] shrink-0" onClick={() => onNext(next)}>
        Go to next lesson
      </button>
    </div>
  )
}

/** Empty playlist — nothing to play. */
export function EmptyCourseState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-bodybg">
      <div className="text-center max-w-sm">
        <i className="ti ti-book-off text-[2rem] text-[#d1d7dc] mb-2" aria-hidden />
        <h2 className="text-[1.125rem] font-bold mb-2">No lessons in this course yet</h2>
        <p className="text-[0.875rem] text-[#6a6f73]">Check back later, or return to My Courses and pick another course.</p>
      </div>
    </div>
  )
}

/** Sequential-unlock copy for locked quizzes / assessments. */
export const DEFAULT_QUIZ_LOCK_MESSAGE = QUIZ_LOCKED_MESSAGE

/** Filled black/white rectangle — primary learn action (Start, Retake, Submit). */
export const LEARN_RECT_PRIMARY =
  "inline-flex items-center justify-center h-8 px-3 rounded-sm bg-[#1c1d1f] text-white text-[0.75rem] font-medium hover:bg-black dark:bg-white dark:text-[#1c1d1f] dark:hover:bg-white/90 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1d1f]/40 disabled:opacity-40 disabled:cursor-not-allowed"

type LearnLockFields = { locked?: boolean; lockReason?: string; lockMessage?: string }

/**
 * Resolve presentational lock state from an item (`locked` / `lockReason`), a locked-id set, or list-level props.
 */
export function learnItemLockState(
  item: (PlaylistItemForLearn & LearnLockFields) | undefined,
  listLocked = false,
  listLockMessage?: string,
  lockedIds?: ReadonlySet<string>,
): { locked: boolean; message: string } {
  const locked = listLocked || item?.locked === true || (!!item && !!lockedIds?.has(item.id))
  const message = item?.lockReason?.trim() || item?.lockMessage?.trim() || listLockMessage || QUIZ_LOCKED_MESSAGE
  return { locked, message }
}

/**
 * Focus-pane empty state when a quiz or assessment is sequential-locked.
 */
export function LearnLockedEmpty({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-2xl border border-dashed border-[#d1d7dc] dark:border-white/15 bg-[#f7f9fa] dark:bg-white/[0.03]">
      <span className="w-14 h-14 rounded-2xl bg-[#1c1d1f]/8 text-[#6a6f73] flex items-center justify-center mb-3" aria-hidden>
        <i className="ti ti-lock text-[1.5rem]" />
      </span>
      <p className="text-[0.9375rem] font-medium text-[#1c1d1f] dark:text-white">This assessment is locked</p>
      <p className="text-[0.8125rem] text-[#6a6f73] dark:text-white/55 mt-2 max-w-md leading-relaxed">
        {message || DEFAULT_QUIZ_LOCK_MESSAGE}
      </p>
    </div>
  )
}

interface LessonStageProps {
  hidePlayer: boolean
  isVideo: boolean
  selectedItem: PlaylistItemForLearn | null
  ytId: string | null
  completing: boolean
  completeLabel: string
  incompleteLabel: string
  videoSlot: React.ReactNode
  youtubeSlot: React.ReactNode
  onComplete: () => void
  onIncomplete: () => void
}

/**
 * Player for videos; compact lesson chrome for articles/docs. Hidden on About tab.
 */
export function LessonStage({
  hidePlayer, isVideo, selectedItem, ytId, completing, completeLabel, incompleteLabel,
  videoSlot, youtubeSlot, onComplete, onIncomplete,
}: LessonStageProps) {
  if (hidePlayer) return null
  if (isVideo && selectedItem?.contentType === "upload-video" && selectedItem.videoFile?.url) return <>{videoSlot}</>
  if (isVideo && selectedItem?.contentType === "youtube-link") {
    if (ytId) return <>{youtubeSlot}</>
    return (
      <div className="flex items-center justify-center flex-col gap-2 p-4 min-h-[12rem]">
        <p className="text-white/90 font-medium">{selectedItem?.title}</p>
        {selectedItem?.youtubeUrl && (
          <a href={selectedItem.youtubeUrl} target="_blank" rel="noopener noreferrer" className="ti-btn ti-btn-sm ti-btn-primary">Open video on YouTube</a>
        )}
      </div>
    )
  }
  if (!isVideo && selectedItem) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-[#1c1d1f] border-b border-[#d1d7dc] dark:border-white/10">
        <div className="min-w-0">
          <p className="text-[0.75rem] uppercase tracking-wide text-[#6a6f73]">{contentKindLabel(selectedItem.contentType)}</p>
          <h2 className="text-[0.9375rem] font-bold truncate">{selectedItem.title}</h2>
        </div>
        {selectedItem.contentType !== "quiz" && selectedItem.contentType !== "essay" && (
          <CompletionToggle
            isCompleted={!!selectedItem.isCompleted}
            completing={completing}
            onComplete={onComplete}
            onIncomplete={onIncomplete}
            completeLabel={completeLabel}
            incompleteLabel={incompleteLabel}
          />
        )}
      </div>
    )
  }
  return null
}

/**
 * When an item is opened, replace the list with the item. Back restores the list.
 * Snaps the overflow scroller to the top so the learner never has to hunt upward.
 */
export function LearnFocusPane({
  reading,
  focusKey,
  backLabel,
  onBack,
  children,
  list,
}: {
  reading: boolean
  focusKey: string
  backLabel: string
  onBack: () => void
  children: React.ReactNode
  list: React.ReactNode
}) {
  const paneRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    if (!reading) return
    const el = paneRef.current
    if (!el) return
    const scroller = el.closest("[data-learn-tab-scroller]")
    if (scroller instanceof HTMLElement) scroller.scrollTop = 0
    else el.scrollIntoView({ behavior: "auto", block: "start" })
    el.focus({ preventScroll: true })
  }, [reading, focusKey])

  if (!reading) return <>{list}</>

  return (
    <div ref={paneRef} tabIndex={-1} className="outline-none" aria-live="polite">
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 sm:px-6 py-2 bg-white/95 dark:bg-[#1c1d1f]/95 backdrop-blur-sm border-b border-[#e4e8eb] dark:border-white/10">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 min-h-11 px-2 rounded-lg text-[0.875rem] font-semibold text-[#1c1d1f] dark:text-white hover:bg-[#f7f9fa] dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onClick={onBack}
        >
          <i className="ti ti-arrow-left" aria-hidden />
          {backLabel}
        </button>
      </div>
      {children}
    </div>
  )
}
