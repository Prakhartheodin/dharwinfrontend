import type { CourseIncludes, CourseLesson, CourseSection } from "@/shared/data/training/courses-data"

/** Parse a lecture duration string like "1hr 20min" into minutes. */
export function lectureMinutes(duration: string | undefined): number {
  if (!duration) return 0
  let min = 0
  const hrMatch = duration.match(/(\d+)\s*hr/)
  const minMatch = duration.match(/(\d+)\s*min/)
  if (hrMatch) min += parseInt(hrMatch[1], 10) * 60
  if (minMatch) min += parseInt(minMatch[1], 10)
  return min
}

/** Format total minutes as a compact duration label. */
export function formatDurationLabel(totalMin: number): string {
  if (totalMin <= 0) return "0m"
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours && mins) return `${hours}h ${mins}m`
  if (hours) return `${hours}h`
  return `${mins}m`
}

/** Sum lectures and duration across curriculum sections. */
export function totalLecturesAndDuration(sections: CourseSection[]) {
  let lectures = 0
  let totalMin = 0
  sections.forEach((s) => {
    s.lectures.forEach((l) => {
      lectures += 1
      totalMin += lectureMinutes(l.duration)
    })
  })
  return { lectures, durationStr: formatDurationLabel(totalMin), totalMin }
}

/** Minutes for one section. */
export function sectionMinutes(lectures: CourseLesson[]): number {
  return lectures.reduce((acc, l) => acc + lectureMinutes(l.duration), 0)
}

export interface IncludeTile {
  icon: string
  label: string
}

/** Map course-includes API fields into display tiles. */
export function includeTiles(includes: CourseIncludes): IncludeTile[] {
  const tiles: IncludeTile[] = []
  if (includes.videoHours != null) {
    tiles.push({ icon: "ti-video", label: `${includes.videoHours} hours on-demand video` })
  }
  if (includes.codingExercises != null && includes.codingExercises > 0) {
    tiles.push({ icon: "ti-code", label: `${includes.codingExercises} coding exercises` })
  }
  if (includes.assignments) tiles.push({ icon: "ti-clipboard-list", label: "Assignments" })
  if (includes.articles != null && includes.articles > 0) {
    tiles.push({ icon: "ti-file-text", label: `${includes.articles} articles` })
  }
  if (includes.downloadableResources != null && includes.downloadableResources > 0) {
    tiles.push({ icon: "ti-download", label: `${includes.downloadableResources} downloadable resources` })
  }
  if (includes.accessOnMobileAndTV) tiles.push({ icon: "ti-devices", label: "Access on mobile and TV" })
  if (includes.closedCaptions) tiles.push({ icon: "ti-subtask", label: "Closed captions" })
  if (includes.certificate) tiles.push({ icon: "ti-certificate", label: "Certificate of completion" })
  return tiles
}

/** First incomplete lecture id, used as an Up next cue. */
export function firstIncompleteLectureId(sections: CourseSection[]): string | null {
  for (const sec of sections) {
    const found = sec.lectures.find((l) => !l.isCompleted)
    if (found) return found.id
  }
  return null
}

/**
 * Split a course description blob into scannable outcome lines.
 */
export function splitDescriptionOutcomes(blob: string): string[] {
  const trimmed = blob.trim()
  if (!trimmed) return []
  const paras = trimmed.split(/\n+/).map((s) => s.trim()).filter((s) => s.length > 24)
  if (paras.length >= 2) return paras.slice(0, 8)
  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
  if (sentences.length >= 2) return sentences.slice(0, 8)
  return [trimmed]
}

/** Prefer real learning outcomes; fall back to description sentences when the API only sent a stub. */
export function outcomePoints(course: {
  learningPoints?: string[]
  descriptionIntro?: string
  description?: string
}): string[] {
  const pts = (course.learningPoints ?? []).map((p) => p.trim()).filter(Boolean)
  if (pts.length >= 2) return pts
  const blob = (course.descriptionIntro || course.description || "").trim()
  if (blob && blob.length > (pts[0]?.length ?? 0) + 20) {
    const fromBlob = splitDescriptionOutcomes(blob)
    if (fromBlob.length) return fromBlob
  }
  return pts
}
