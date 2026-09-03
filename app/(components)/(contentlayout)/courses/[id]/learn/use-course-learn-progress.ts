"use client"

import { useCallback, useMemo, useState } from "react"
import type { PlaylistItemForLearn } from "@/shared/lib/api/student-courses"
import { markCourseItemComplete } from "@/shared/lib/api/student-courses"
import { markCourseItemIncomplete } from "@/shared/lib/api/course-learner-notes"
import { getApiErrorMessage } from "@/shared/lib/api/client"
import { completionCopy } from "./course-learn-helpers"

type Tone = "success" | "error"

/**
 * Optimistic complete/incomplete overlay so the learn page never refetches the course.
 */
export function useCourseLearnProgress(
  rawPlaylist: PlaylistItemForLearn[],
  courseProgress: number | undefined
) {
  const [completedOverride, setCompletedOverride] = useState<Record<string, boolean>>({})
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [progressOverride, setProgressOverride] = useState<number | null>(null)

  const playlistItems = useMemo(
    () =>
      rawPlaylist.map((item) =>
        completedOverride[item.id] !== undefined ? { ...item, isCompleted: completedOverride[item.id] } : item
      ),
    [rawPlaylist, completedOverride]
  )

  const completedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const item of playlistItems) {
      if (item.isCompleted) ids.add(item.id)
    }
    return ids
  }, [playlistItems])

  const displayProgress = useMemo(() => {
    if (progressOverride != null) return progressOverride
    if (!playlistItems.length) return courseProgress ?? 0
    return Math.round((completedIds.size / playlistItems.length) * 100)
  }, [progressOverride, playlistItems.length, completedIds, courseProgress])

  /** Apply a local completion flag and optional server percentage. */
  const applyCompletion = useCallback((itemId: string, isCompleted: boolean, serverPct?: number) => {
    setCompletedOverride((prev) => ({ ...prev, [itemId]: isCompleted }))
    if (typeof serverPct === "number") setProgressOverride(serverPct)
  }, [])

  return {
    playlistItems,
    completedIds,
    completingId,
    setCompletingId,
    displayProgress,
    applyCompletion,
  }
}

/**
 * Mark complete/incomplete against the API while updating UI immediately.
 */
export async function persistLearnItemCompletion(opts: {
  studentId: string
  moduleId: string
  item: PlaylistItemForLearn
  complete: boolean
  applyCompletion: (itemId: string, isCompleted: boolean, serverPct?: number) => void
  setSelectedCompleted: (itemId: string, isCompleted: boolean) => void
  setCompletingId: (id: string | null) => void
  completingId: string | null
  showFeedback: (message: string, tone: Tone) => void
}): Promise<void> {
  const { item, complete } = opts
  if (opts.completingId === item.id) return
  const previous = !!item.isCompleted
  opts.setCompletingId(item.id)
  opts.applyCompletion(item.id, complete)
  opts.setSelectedCompleted(item.id, complete)
  const labels = completionCopy(item.contentType)
  try {
    const result = complete
      ? await markCourseItemComplete(opts.studentId, opts.moduleId, item.id, item.contentType)
      : await markCourseItemIncomplete(opts.studentId, opts.moduleId, item.id)
    const pct = result.progress?.percentage
    if (typeof pct === "number") opts.applyCompletion(item.id, complete, pct)
    opts.showFeedback(complete ? labels.doneToast : labels.undoToast, "success")
  } catch (err) {
    opts.applyCompletion(item.id, previous)
    opts.setSelectedCompleted(item.id, previous)
    opts.showFeedback(
      getApiErrorMessage(err, complete ? "Could not save progress. Try again." : "Could not undo. Try again."),
      "error"
    )
  } finally {
    opts.setCompletingId(null)
  }
}
