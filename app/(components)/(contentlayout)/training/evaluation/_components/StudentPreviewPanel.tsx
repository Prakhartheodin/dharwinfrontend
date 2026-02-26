"use client"

import React, { useMemo } from 'react'
import type { EvaluationRow } from '@/shared/lib/api/evaluation'

function getStatus(row: EvaluationRow): 'Completed' | 'In Progress' | 'Not Started' {
  const rate = row.completionRate ?? 0
  const completedAt = row.completedAt
  if (rate >= 100 && completedAt) return 'Completed'
  if (rate > 0) return 'In Progress'
  return 'Not Started'
}

export interface StudentPreviewPanelProps {
  studentId: string | null
  studentName: string
  evaluations: EvaluationRow[]
  onClose: () => void
}

const StudentPreviewPanel: React.FC<StudentPreviewPanelProps> = ({
  studentId,
  studentName,
  evaluations,
  onClose,
}) => {
  const studentCourses = useMemo(() => {
    if (!studentId) return []
    return evaluations.filter((e) => e.studentId === studentId)
  }, [studentId, evaluations])

  const summary = useMemo(() => {
    const n = studentCourses.length
    if (n === 0) return { totalCourses: 0, avgCompletion: 0, avgQuizScore: null as number | null }
    const totalCompletion = studentCourses.reduce((s, e) => s + (e.completionRate ?? 0), 0)
    const scores = studentCourses.map((e) => e.quizScore).filter((v): v is number => v != null)
    const avgQuiz = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    return {
      totalCourses: n,
      avgCompletion: totalCompletion / n,
      avgQuizScore: avgQuiz != null ? Math.round(avgQuiz) : null,
    }
  }, [studentCourses])

  return (
    <div
      id="student-preview-panel"
      className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
      tabIndex={-1}
    >
      <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
        <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
          <i className="ri-user-line text-primary text-base" />
          {studentName || 'Student Preview'}
        </h6>
        <button
          type="button"
          className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1"
          data-hs-overlay="#student-preview-panel"
          onClick={onClose}
        >
          <span className="sr-only">Close</span>
          <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor" />
          </svg>
        </button>
      </div>
      <div className="ti-offcanvas-body !p-4">
        {studentId ? (
          <div className="space-y-4">
            {/* Summary row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-lg">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Courses</div>
                <div className="font-semibold text-gray-800 dark:text-white">{summary.totalCourses}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg completion</div>
                <div className="font-semibold text-gray-800 dark:text-white">{Math.round(summary.avgCompletion)}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg quiz score</div>
                <div className="font-semibold text-gray-800 dark:text-white">{summary.avgQuizScore != null ? `${summary.avgQuizScore}%` : '—'}</div>
              </div>
            </div>

            {/* Course cards */}
            <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <i className="ri-book-open-line text-primary" />
              Assigned Courses ({studentCourses.length})
            </h6>
            {studentCourses.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No courses enrolled.</p>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-18rem)] overflow-y-auto">
                {studentCourses.map((row) => {
                  const pct = row.completionRate != null ? Math.min(100, Math.max(0, Math.round(row.completionRate))) : 0
                  const status = getStatus(row)
                  const badgeClass =
                    status === 'Completed'
                      ? 'bg-success/10 text-success'
                      : status === 'In Progress'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-gray-200 dark:bg-white/10 text-defaulttextcolor dark:text-defaulttextcolor/80'
                  return (
                    <div
                      key={`${row.studentId}-${row.courseId}-${row.courseName}`}
                      className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg bg-white dark:bg-black/10"
                    >
                      <div className="font-medium text-gray-800 dark:text-white mb-2">{row.courseName}</div>
                      <div className="flex items-center gap-2 min-w-[120px] mb-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 100 ? 'bg-success' : pct > 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-white/20'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[0.75rem] font-medium shrink-0 w-9">{pct}%</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${badgeClass}`}>
                          {status}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          Completed: {row.completedAt ? new Date(row.completedAt).toLocaleDateString() : '—'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          Quiz: {row.quizScore != null ? `${row.quizScore}%` : '—'} ({row.quizTries ?? 0} tries)
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10">
              <button
                type="button"
                className="ti-btn ti-btn-light w-full sm:w-auto"
                data-hs-overlay="#student-preview-panel"
                onClick={onClose}
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
