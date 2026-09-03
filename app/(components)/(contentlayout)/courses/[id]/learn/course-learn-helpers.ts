import type { PlaylistItemContentType } from "@/shared/lib/api/student-courses"
import type { CourseLesson } from "@/shared/data/training/courses-data"

export type LearnTabId = "overview" | "video" | "blog" | "quiz" | "pdf" | "essay"

export const TAB_CONFIG: { id: LearnTabId; label: string; icon: string; contentTypes?: PlaylistItemContentType[] }[] = [
  { id: "overview", label: "About this course", icon: "ti-layout-dashboard" },
  { id: "video", label: "Videos", icon: "ti-player-play", contentTypes: ["upload-video", "youtube-link"] },
  { id: "blog", label: "Articles", icon: "ti-article", contentTypes: ["blog"] },
  { id: "quiz", label: "Quizzes", icon: "ti-clipboard-check", contentTypes: ["quiz"] },
  { id: "pdf", label: "Documents", icon: "ti-file-text", contentTypes: ["pdf-document"] },
  { id: "essay", label: "Q&A", icon: "ti-message-dots", contentTypes: ["essay"] },
]

/** Human label for a learn tab. */
export function tabLabel(id: LearnTabId): string {
  return TAB_CONFIG.find((t) => t.id === id)?.label ?? id
}

/** Short kind label shown on the current-lesson chrome (never the raw contentType). */
export function contentKindLabel(contentType: PlaylistItemContentType | undefined): string {
  if (!contentType) return "Lesson"
  if (contentType === "upload-video" || contentType === "youtube-link") return "Video"
  if (contentType === "blog") return "Article"
  if (contentType === "quiz") return "Quiz"
  if (contentType === "pdf-document") return "Document"
  if (contentType === "essay") return "Q&A"
  return "Lesson"
}

/** Complete / undo copy that matches the content kind. */
export function completionCopy(contentType: PlaylistItemContentType | undefined): {
  complete: string
  incomplete: string
  doneToast: string
  undoToast: string
} {
  if (contentType === "upload-video" || contentType === "youtube-link") {
    return { complete: "I've watched this", incomplete: "Undo watched", doneToast: "Marked as watched", undoToast: "Marked as not watched" }
  }
  if (contentType === "blog") {
    return { complete: "I've read this", incomplete: "Undo read", doneToast: "Marked as read", undoToast: "Marked as not read" }
  }
  return { complete: "Mark complete", incomplete: "Undo complete", doneToast: "Lesson marked complete", undoToast: "Lesson unmarked" }
}

/** First unfinished item, otherwise the first item (resume target). */
export function resumePlaylistItem<T extends { isCompleted?: boolean }>(items: T[]): T | null {
  if (!items.length) return null
  return items.find((item) => !item.isCompleted) ?? items[0]
}

/** Next item after `currentId` in playlist order. */
export function nextPlaylistItem<T extends { id: string }>(items: T[], currentId: string | null): T | null {
  if (!currentId) return items[0] ?? null
  const idx = items.findIndex((item) => item.id === currentId)
  if (idx < 0) return items[0] ?? null
  return items[idx + 1] ?? null
}

export const QUIZ_LOCKED_MESSAGE =
  "This quiz is locked. Please complete the previous module(s) in sequential order to unlock this assessment."

/**
 * Sequential quiz lock: prior sections must be fully complete, and items before
 * this quiz in the same section must be complete. Uses already-loaded playlist data.
 * Prefer `buildLockedItemIds` when checking many items (one O(n) pass).
 */
export function isQuizLocked(
  quizId: string,
  sections: { lectures: { id: string }[] }[],
  playlistItems: { id: string; isCompleted?: boolean }[]
): boolean {
  return isItemLocked(sections, playlistItems, quizId)
}
/** Empty-state sentence for a content tab. */
export function emptyTabCopy(tab: LearnTabId): string {
  if (tab === "video") return "This course has no videos yet. Pick a lesson from the list on the right."
  if (tab === "blog") return "This course has no articles yet. Pick a lesson from the list on the right."
  if (tab === "quiz") return "This course has no quizzes yet. Pick a lesson from the list on the right."
  if (tab === "pdf") return "This course has no documents yet. Pick a lesson from the list on the right."
  if (tab === "essay") return "This course has no Q&A yet. Pick a lesson from the list on the right."
  return "Nothing to show here yet."
}

/**
 * Whether a playlist item belongs on the given learn tab.
 */
export function itemMatchesTab(
  item: { contentType: PlaylistItemContentType } | null | undefined,
  tab: LearnTabId
): boolean {
  if (!item) return false
  return tabForContentType(item.contentType) === tab
}

/**
 * Orientation copy when the tab is list-browse (no item of that type is open).
 */
export function tabBrowseOrientation(tab: LearnTabId): string {
  if (tab === "quiz") return "Quizzes · pick a quiz to start"
  if (tab === "essay") return "Q&A · pick a question set"
  if (tab === "pdf") return "Documents · pick a document"
  if (tab === "video") return "Videos · pick a video to watch"
  if (tab === "blog") return "Articles · open one from Course content"
  return "About this course"
}

/** Map playlist content type to the matching learn tab. */
export function tabForContentType(contentType: PlaylistItemContentType): LearnTabId {
  if (contentType === "upload-video" || contentType === "youtube-link") return "video"
  if (contentType === "blog") return "blog"
  if (contentType === "quiz") return "quiz"
  if (contentType === "pdf-document") return "pdf"
  if (contentType === "essay") return "essay"
  return "overview"
}

/** Extract YouTube video ID from url (youtube.com/watch?v=ID or youtu.be/ID). */
export function youtubeVideoId(url: string | undefined): string | null {
  if (!url?.trim()) return null
  const u = url.trim()
  const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

/** Sum lesson durations in minutes. */
export function sectionDurationMin(lectures: CourseLesson[]): number {
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

/** Format minutes as hr/min. */
export function formatDuration(min: number): string {
  if (min >= 60) return `${Math.floor(min / 60)}hr ${min % 60}min`
  return `${min}min`
}

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
export const WATCH_THRESHOLD = 0.9

/** Format seconds as m:ss. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

/** Split a wall of text into paragraphs for display. */
export function descriptionParagraphs(raw: string): string[] {
  const text = (raw ?? "").trim()
  if (!text) return []
  const byBreak = text.split(/\n{2,}|\r\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean)
  if (byBreak.length > 1) return byBreak
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length <= 2) return [text]
  const chunks: string[] = []
  for (let i = 0; i < sentences.length; i += 2) {
    chunks.push(sentences.slice(i, i + 2).join(" "))
  }
  return chunks
}

export const LEARN_SCHEDULE_STORAGE_PREFIX = "dharwin-learn-schedule-"

export interface LearnSchedule {
  days: string[]
  time: string
}

/** Persist a learning schedule locally for this course. */
export function saveLearnSchedule(moduleId: string, schedule: LearnSchedule): void {
  try {
    localStorage.setItem(`${LEARN_SCHEDULE_STORAGE_PREFIX}${moduleId}`, JSON.stringify(schedule))
  } catch (err) {
    console.warn("Could not save learning schedule", err)
  }
}

/** Load a saved learning schedule. */
export function loadLearnSchedule(moduleId: string): LearnSchedule | null {
  try {
    const raw = localStorage.getItem(`${LEARN_SCHEDULE_STORAGE_PREFIX}${moduleId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LearnSchedule
    if (!parsed?.time || !Array.isArray(parsed.days)) return null
    return parsed
  } catch (err) {
    console.warn("Could not load learning schedule", err)
    return null
  }
}

export type LockablePlaylistItem = {
  id: string
  isCompleted?: boolean
  contentType?: string
  playlistIndex?: number
}

export type LockableSection = {
  lectures: { id: string }[]
}

/**
 * Playlist order: section lectures if present, else playlistIndex.
 */
function orderedLockIds(sections: LockableSection[] | undefined, playlistItems: LockablePlaylistItem[]): string[] {
  if (sections?.length) {
    const ids = sections.flatMap((s) => s.lectures.map((l) => l.id))
    if (ids.length) return ids
  }
  return [...playlistItems]
    .sort((a, b) => (a.playlistIndex ?? 0) - (b.playlistIndex ?? 0))
    .map((p) => p.id)
}

/**
 * Build a completed-id Set in one pass (O(n)).
 */
export function buildCompletedIdSet(playlistItems: LockablePlaylistItem[]): Set<string> {
  const completed = new Set<string>()
  for (const item of playlistItems) {
    if (item.isCompleted) completed.add(item.id)
  }
  return completed
}

/**
 * Quizzes locked until prior sections + earlier items in the same section are complete.
 * One O(n) pass with a completed Set — do not call isItemLocked in a list loop.
 */
export function buildLockedItemIds(
  sections: LockableSection[] | undefined,
  playlistItems: LockablePlaylistItem[]
): Set<string> {
  const completed = buildCompletedIdSet(playlistItems)
  const byId = new Map(playlistItems.map((p) => [p.id, p]))
  const locked = new Set<string>()
  const secs: LockableSection[] = sections?.length
    ? sections
    : [{ lectures: orderedLockIds(undefined, playlistItems).map((id) => ({ id })) }]

  let priorSectionIncomplete = false
  for (const section of secs) {
    let blocked = priorSectionIncomplete
    let sectionIncomplete = false
    for (const lec of section.lectures) {
      const item = byId.get(lec.id)
      // Completed quizzes stay unlockable for retake.
      if (item?.contentType === "quiz" && blocked && !item.isCompleted) locked.add(lec.id)
      if (!completed.has(lec.id)) {
        blocked = true
        sectionIncomplete = true
      }
    }
    if (sectionIncomplete) priorSectionIncomplete = true
  }
  return locked
}

/**
 * Whether `itemId` is a sequentially locked quiz. O(n) via completed Set — not per-item `.some` on the full array.
 */
export function isItemLocked(
  sections: LockableSection[] | undefined,
  playlistItems: LockablePlaylistItem[],
  itemId: string
): boolean {
  return buildLockedItemIds(sections, playlistItems).has(itemId)
}

/**
 * Stamp sequential lock flags onto already-loaded playlist items (no extra course fetch).
 */
export function withQuizLockFlags<T extends { id: string }>(
  items: T[],
  lockedIds: Set<string>
): Array<T & { locked: boolean; lockReason?: string }> {
  return items.map((item) =>
    lockedIds.has(item.id)
      ? { ...item, locked: true, lockReason: QUIZ_LOCKED_MESSAGE }
      : { ...item, locked: false }
  )
}
