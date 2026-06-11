"use client"

import React, { useMemo } from 'react'
import Link from 'next/link'
import type { EvaluationRow } from '@/shared/lib/api/evaluation'
import {
  EVAL_BTN_ICON_CLOSE,
  EVAL_BTN_LIGHT,
  EVAL_BTN_OUTLINE_PRIMARY,
} from './evaluation-buttons'
import {
  getCourseDisplayStatus,
  statusBadgeClass,
  atRiskLabel,
  formatShortDate,
} from './evaluation-utils'

export interface StudentPreviewPanelProps {
  studentId: string | null
  studentName: string
  evaluations: EvaluationRow[]
  onClose: () => void
  onOpenProfile?: (studentId: string) => void
  profileOpening?: boolean
}

const StudentPreviewPanel: React.FC<StudentPreviewPanelProps> = ({
  studentId,
  studentName,
  evaluations,
  onClose,
  onOpenProfile,
  profileOpening = false,
}) => {
  const studentCourses = useMemo(() => {
    if (!studentId) return []
    return evaluations.filter((e) => e.studentId === studentId)
  }, [studentId, evaluations])

  const summary = useMemo(() => {
    const n = studentCourses.length
    if (n === 0) {
      return {
        totalCourses: 0,
        avgCompletion: 0,
        avgQuizScore: null as number | null,
        atRiskCount: 0,
        positionName: null as string | null,
      }
    }
    const totalCompletion = studentCourses.reduce((s, e) => s + (e.completionRate ?? 0), 0)
    const scores = studentCourses.map((e) => e.quizScore).filter((v): v is number => v != null)
    const avgQuiz = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    return {
      totalCourses: n,
      avgCompletion: totalCompletion / n,
      avgQuizScore: avgQuiz != null ? Math.round(avgQuiz) : null,
      atRiskCount: studentCourses.filter((c) => c.atRisk).length,
      positionName: studentCourses[0]?.positionName ?? null,
    }
  }, [studentCourses])

  return (
    <div
      id="student-preview-panel"
      className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
      tabIndex={-1}
      aria-labelledby="student-preview-title"
    >
      <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
        <h6 id="student-preview-title" className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
          <i className="ri-user-line text-primary text-base" aria-hidden />
          {studentName || 'Student Preview'}
        </h6>
        <button
          type="button"
          className={`hs-dropdown-toggle ${EVAL_BTN_ICON_CLOSE}`}
          data-hs-overlay="#student-preview-panel"
          onClick={onClose}
          aria-label="Close student preview"
        >
          <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor" />
          </svg>
        </button>
      </div>
      <div className="ti-offcanvas-body !p-4">
        {studentId ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {summary.positionName && (
                <p className="text-sm text-defaulttextcolor/70 mb-0">
                  Position: <span className="font-medium text-defaulttextcolor">{summary.positionName}</span>
                </p>
              )}
              {onOpenProfile ? (
                <button
                  type="button"
                  className={EVAL_BTN_OUTLINE_PRIMARY}
                  onClick={() => onOpenProfile(studentId)}
                  disabled={profileOpening}
                  aria-busy={profileOpening}
                  aria-label="View full student profile"
                >
                  {profileOpening ? (
                    <i className="ri-loader-4-line animate-spin motion-reduce:animate-none" aria-hidden />
                  ) : (
                    <i className="ri-user-line" aria-hidden />
                  )}
                  {profileOpening ? 'Opening…' : 'View full profile'}
                </button>
              ) : (
                <Link
                  href={`/training/students/edit/?id=${encodeURIComponent(studentId)}`}
                  className={EVAL_BTN_OUTLINE_PRIMARY}
                >
                  Open student profile
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-lg">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Courses</div>
                <div className="font-semibold text-gray-800 dark:text-white tabular-nums">{summary.totalCourses}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg completion</div>
                <div className="font-semibold text-gray-800 dark:text-white tabular-nums">{Math.round(summary.avgCompletion)}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg quiz score</div>
                <div className="font-semibold text-gray-800 dark:text-white tabular-nums">
                  {summary.avgQuizScore != null ? `${summary.avgQuizScore}%` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">At risk</div>
                <div className={`font-semibold tabular-nums ${summary.atRiskCount > 0 ? 'text-danger' : 'text-gray-800 dark:text-white'}`}>
                  {summary.atRiskCount}
                </div>
              </div>
            </div>

            <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <i className="ri-book-open-line text-primary" aria-hidden />
              Assigned Courses ({studentCourses.length})
            </h6>
            {studentCourses.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No courses enrolled.</p>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-18rem)] overflow-y-auto">
                {studentCourses.map((row) => {
                  const pct = row.completionRate != null ? Math.min(100, Math.max(0, Math.round(row.completionRate))) : 0
                  const status = getCourseDisplayStatus(row)
                  return (
                    <div
                      key={`${row.studentId}-${row.courseId}`}
                      className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg bg-white dark:bg-black/10"
                    >
                      <div className="font-medium text-gray-800 dark:text-white mb-2">{row.courseName}</div>
                      <div className="flex items-center gap-2 min-w-[120px] mb-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none ${
                              pct >= 100 ? 'bg-success' : pct > 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-white/20'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[0.75rem] font-medium shrink-0 w-9 tabular-nums">{pct}%</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium ${statusBadgeClass(status)}`}>
                          <i
                            className={
                              status === 'Completed'
                                ? 'ri-checkbox-circle-line'
                                : status === 'In Progress'
                                  ? 'ri-time-line'
                                  : 'ri-pause-circle-line'
                            }
                            aria-hidden
                          />
                          {status}
                        </span>
                        {row.atRisk && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium bg-danger/10 text-danger">
                            <i className="ri-alert-line" aria-hidden />
                            {atRiskLabel(row.atRiskReason)}
                          </span>
                        )}
                        {row.certificateIssued && (
                          <span className="inline-flex items-center gap-1 text-success">
                            <i className="ri-award-line" aria-hidden />
                            Certificate
                          </span>
                        )}
                      </div>
                      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[0.75rem] text-gray-500 dark:text-gray-400">
                        <div>
                          <dt className="inline">Last accessed: </dt>
                          <dd className="inline text-defaulttextcolor">{formatShortDate(row.lastAccessedAt)}</dd>
                        </div>
                        <div>
                          <dt className="inline">Completed: </dt>
                          <dd className="inline text-defaulttextcolor">{formatShortDate(row.completedAt)}</dd>
                        </div>
                        <div>
                          <dt className="inline">Quiz: </dt>
                          <dd className="inline text-defaulttextcolor tabular-nums">
                            {row.quizScore != null ? `${row.quizScore}%` : '—'}
                            {row.quizScoreBest != null && row.quizScoreBest !== row.quizScore
                              ? ` (best ${row.quizScoreBest}%)`
                              : ''}
                            {' '}({row.quizTries ?? 0} tries)
                          </dd>
                        </div>
                        <div>
                          <dt className="inline">Essay: </dt>
                          <dd className="inline text-defaulttextcolor tabular-nums">
                            {row.essayScore != null ? `${row.essayScore}%` : '—'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10">
              <button
                type="button"
                className={`${EVAL_BTN_LIGHT} w-full sm:w-auto`}
                data-hs-overlay="#student-preview-panel"
                onClick={onClose}
                aria-label="Close preview panel"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No student selected</div>
        )}
      </div>
    </div>
  )
}

export default StudentPreviewPanel
