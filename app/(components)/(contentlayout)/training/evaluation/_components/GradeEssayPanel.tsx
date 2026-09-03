"use client"

import React, { useEffect, useState } from "react"
import { getStudentEssayAttempts, type TrainerEssayAttemptsResponse, type TrainerEssayItem } from "@/shared/lib/api/evaluation"
import { getApiErrorMessage } from "@/shared/lib/api/client"
import { EVAL_BTN_ICON_CLOSE, EVAL_BTN_LIGHT, EVAL_BTN_OUTLINE_PRIMARY } from "./evaluation-buttons"
import { closeHsOverlay } from "./evaluation-overlay"
import GradeEssayAttemptForm from "./GradeEssayAttemptForm"

export const GRADE_ESSAY_OVERLAY_ID = "grade-essay-panel"

export interface GradeEssayPanelProps {
  studentId: string | null
  studentName: string
  moduleId: string | null
  courseName: string
  onClose: () => void
  onSaved?: () => void
}

/**
 * Trainer overlay: list Q&A items/attempts and edit marks.
 */
const GradeEssayPanel: React.FC<GradeEssayPanelProps> = ({
  studentId,
  studentName,
  moduleId,
  courseName,
  onClose,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TrainerEssayAttemptsResponse | null>(null)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [openAttemptKey, setOpenAttemptKey] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  /**
   * Load Q&A attempts for the selected student + course.
   */
  async function loadAttempts() {
    if (!studentId || !moduleId) return
    setLoading(true)
    setError(null)
    try {
      const res = await getStudentEssayAttempts(studentId, moduleId)
      setData(res)
      const firstPending = res.items.find((item) => item.pending && item.attempts.length)
      const firstWithAttempts = res.items.find((item) => item.attempts.length)
      const pick = firstPending ?? firstWithAttempts
      setOpenItemId(pick?.playlistItemId ?? null)
      const latest = pick?.attempts[0]
      setOpenAttemptKey(latest ? `${pick!.playlistItemId}:${latest.attemptId}` : null)
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load Q&A attempts."))
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!studentId || !moduleId) {
      setData(null)
      setError(null)
      return
    }
    void loadAttempts()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when target changes
  }, [studentId, moduleId])

  /**
   * Close overlay and notify parent.
   */
  function handleClose() {
    closeHsOverlay(`#${GRADE_ESSAY_OVERLAY_ID}`)
    onClose()
  }

  /**
   * After a successful PATCH, reload attempts and evaluation rows.
   */
  function handleSaved() {
    setFormKey((k) => k + 1)
    void loadAttempts()
    onSaved?.()
  }

  const items = data?.items ?? []
  const emptyCourse = !loading && !error && items.length === 0
  const nothingToGrade = !loading && !error && items.length > 0 && items.every((item) => item.attempts.length === 0)

  return (
    <>
      <button type="button" className="hidden" data-hs-overlay={`#${GRADE_ESSAY_OVERLAY_ID}`} aria-hidden tabIndex={-1} />
      <div
        id={GRADE_ESSAY_OVERLAY_ID}
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[107] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
        aria-labelledby="grade-essay-title"
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 id="grade-essay-title" className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-edit-2-line text-primary text-base" aria-hidden />
            Grade Q&A — {courseName || "Course"}
          </h6>
          <button
            type="button"
            className={`hs-dropdown-toggle ${EVAL_BTN_ICON_CLOSE}`}
            data-hs-overlay={`#${GRADE_ESSAY_OVERLAY_ID}`}
            onClick={handleClose}
            aria-label="Close Q&A grading panel"
          >
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {studentId && moduleId ? (
            <div className="space-y-4">
              <p className="text-sm text-defaulttextcolor/70 mb-0">
                {studentName || "Learner"} · {data?.moduleName || courseName}
              </p>
              {loading && <p className="text-sm text-defaulttextcolor/70">Loading Q&A attempts…</p>}
              {error && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 space-y-2" role="alert">
                  <p className="text-sm text-rose-700 dark:text-rose-300 mb-0">{error}</p>
                  <button type="button" className={EVAL_BTN_OUTLINE_PRIMARY} onClick={() => void loadAttempts()}>
                    Retry
                  </button>
                </div>
              )}
              {emptyCourse && <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No Q&A items in this course.</p>}
              {nothingToGrade && <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Nothing to grade yet — no submitted attempts.</p>}
              <div className="space-y-3 max-h-[calc(100vh-14rem)] overflow-y-auto">
                {items.map((item) => (
                  <EssayItemBlock
                    key={item.playlistItemId}
                    item={item}
                    open={openItemId === item.playlistItemId}
                    openAttemptKey={openAttemptKey}
                    formKey={formKey}
                    onToggle={() => setOpenItemId((id) => (id === item.playlistItemId ? null : item.playlistItemId))}
                    onSelectAttempt={(key) => {
                      setOpenItemId(item.playlistItemId)
                      setOpenAttemptKey(key)
                    }}
                    onSaved={handleSaved}
                  />
                ))}
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-defaultborder/10">
                <button type="button" className={`${EVAL_BTN_LIGHT} w-full sm:w-auto`} onClick={handleClose} aria-label="Close Q&A grading panel">
                  Close
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">No course selected</p>
          )}
        </div>
      </div>
    </>
  )
}

interface EssayItemBlockProps {
  item: TrainerEssayItem
  open: boolean
  openAttemptKey: string | null
  formKey: number
  onToggle: () => void
  onSelectAttempt: (key: string) => void
  onSaved: () => void
}

/**
 * Accordion block for one Q&A playlist item and its attempts.
 */
function EssayItemBlock({ item, open, openAttemptKey, formKey, onToggle, onSelectAttempt, onSaved }: EssayItemBlockProps) {
  return (
    <section className="rounded-lg border border-gray-200 dark:border-defaultborder/10 bg-white dark:bg-black/10">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 p-4 text-start min-h-[44px]"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="font-medium text-gray-800 dark:text-white">{item.title}</span>
        <span className="text-xs text-defaulttextcolor/60 shrink-0">
          {item.pending ? "Awaiting review" : item.attempts.length ? "Graded" : "No attempts"}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {item.attempts.length === 0 ? (
            <p className="text-sm text-gray-500">No submissions for this Q&A.</p>
          ) : (
            item.attempts.map((attempt) => {
              const key = `${item.playlistItemId}:${attempt.attemptId}`
              const isOpen = openAttemptKey === key
              const pct = attempt.attempt.score?.percentage
              return (
                <div key={key} className="rounded-md border border-gray-200 dark:border-white/10">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 p-3 text-start min-h-[44px] text-sm"
                    onClick={() => onSelectAttempt(isOpen ? "" : key)}
                    aria-expanded={isOpen}
                  >
                    <span>Attempt {attempt.attempt.attemptNumber}</span>
                    <span className="tabular-nums text-defaulttextcolor/70">
                      {typeof pct === "number" ? `${pct}%` : "Ungraded"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3">
                      <GradeEssayAttemptForm key={`${key}-${formKey}`} payload={attempt} onSaved={onSaved} />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </section>
  )
}

export default GradeEssayPanel
