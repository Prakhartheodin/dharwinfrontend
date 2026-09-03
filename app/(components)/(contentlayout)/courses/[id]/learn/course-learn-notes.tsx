"use client"

import React, { useEffect, useState } from "react"
import { getCourseLearnerNote, saveCourseLearnerNote } from "@/shared/lib/api/course-learner-notes"
import { getApiErrorMessage } from "@/shared/lib/api/client"

/**
 * Private notes for the current learner + course + lesson.
 */
export function LearnerNotesPanel({
  studentId,
  moduleId,
  playlistItemId,
  lessonTitle,
}: {
  studentId: string
  moduleId: string
  playlistItemId: string
  lessonTitle: string
}) {
  const [open, setOpen] = useState(true)
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const note = await getCourseLearnerNote(studentId, moduleId, playlistItemId)
        if (!cancelled) {
          setBody(note.body ?? "")
          setSavedAt(note.updatedAt)
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load notes."))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (open) load()
    return () => { cancelled = true }
  }, [open, studentId, moduleId, playlistItemId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const note = await saveCourseLearnerNote(studentId, moduleId, playlistItemId, body)
      setSavedAt(note.updatedAt)
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save notes."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="border-y border-[#e4e8eb] dark:border-white/10 bg-[#f7f9fa] dark:bg-white/[0.04]">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 min-h-12 px-4 sm:px-6 py-3 text-left transition-colors duration-200 hover:bg-white/70 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="learner-notes-panel"
      >
        <span className="inline-flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden>
            <i className="ti ti-notes text-[1rem]" />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.875rem] font-semibold text-[#1c1d1f] dark:text-white">Notes</span>
            <span className="block text-[0.75rem] text-[#6a6f73] dark:text-white/55 truncate">Private to you · this lesson</span>
          </span>
        </span>
        <i className={`ti ti-chevron-${open ? "up" : "down"} text-[#6a6f73] text-[1rem] shrink-0 transition-transform duration-200`} aria-hidden />
      </button>
      {open && (
        <div id="learner-notes-panel" className="px-4 sm:px-6 pb-5 space-y-3">
          <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/60 truncate" title={lessonTitle}>
            {lessonTitle}
          </p>
          {loading ? (
            <div className="h-[140px] rounded-xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/5 animate-pulse" aria-busy="true" aria-label="Loading notes" />
          ) : (
            <textarea
              className="w-full min-h-[140px] rounded-xl border border-[#d1d7dc] dark:border-white/20 bg-white dark:bg-white/5 p-3.5 text-[0.875rem] leading-relaxed text-[#1c1d1f] dark:text-white placeholder:text-[#9ca3af] transition-shadow duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-label={`Notes for ${lessonTitle}`}
              placeholder="Jot a takeaway, timestamp, or question for this lesson…"
            />
          )}
          {error && <p className="text-[0.8125rem] text-red-600 dark:text-red-400" role="alert">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="ti-btn ti-btn-primary min-h-11" onClick={handleSave} disabled={saving || loading} aria-busy={saving}>
              {saving ? "Saving…" : "Save note"}
            </button>
            {savedAt && (
              <span className="text-[0.75rem] text-[#6a6f73] dark:text-white/55">
                Saved {new Date(savedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
