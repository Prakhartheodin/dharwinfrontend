'use client'

import React from 'react'
import type { EvaluationRow } from '@/shared/lib/api/evaluation'
import { EVAL_BTN_ICON_CLOSE, EVAL_BTN_LIGHT, EVAL_BTN_OUTLINE_PRIMARY } from './evaluation-buttons'
import { CompletionBar } from './evaluation-table-parts'
import { atRiskLabel, formatShortDate, getCourseDisplayStatus, statusBadgeClass } from './evaluation-utils'

export type AtRiskContext =
  | { type: 'course'; courseId: string; title: string }
  | { type: 'student'; studentId: string; title: string }

export interface AtRiskOverlayPanelProps {
  context: AtRiskContext | null
  rows: EvaluationRow[]
  onClose: () => void
  onPreviewStudent?: (studentId: string, studentName: string) => void
  onViewProfile?: (studentId: string) => void
  viewingProfileId?: string | null
}

const AtRiskOverlayPanel: React.FC<AtRiskOverlayPanelProps> = ({
  context,
  rows,
  onClose,
  onPreviewStudent,
  onViewProfile,
  viewingProfileId = null,
}) => {
  const isCourseView = context?.type === 'course'
  const subtitle = isCourseView
    ? 'Students flagged as at risk in this course'
    : 'Courses where this student is at risk'

  return (
    <>
      {/* Registers this panel with Preline HSOverlay.autoInit */}
      <button
        type="button"
        className="hidden"
        data-hs-overlay="#at-risk-overlay-panel"
        aria-hidden
        tabIndex={-1}
      />
      <div
        id="at-risk-overlay-panel"
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[106] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
        aria-labelledby="at-risk-overlay-title"
      >
      <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
        <h6 id="at-risk-overlay-title" className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
          <i className="ri-alert-line text-danger text-base" aria-hidden />
          At risk — {context?.title ?? 'Details'}
        </h6>
        <button
          type="button"
          className={`hs-dropdown-toggle ${EVAL_BTN_ICON_CLOSE}`}
          data-hs-overlay="#at-risk-overlay-panel"
          onClick={onClose}
          aria-label="Close at-risk list"
        >
          <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor" />
          </svg>
        </button>
      </div>
      <div className="ti-offcanvas-body !p-4">
        {context ? (
          <div className="space-y-4">
            <p className="text-sm text-defaulttextcolor/70 mb-0">{subtitle}</p>
            <p className="text-sm font-medium text-danger mb-0 tabular-nums">
              {rows.length} {rows.length === 1 ? 'enrollment' : 'enrollments'} at risk
            </p>

            {rows.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No at-risk enrollments found.</p>
            ) : (
              <ul className="space-y-3 max-h-[calc(100vh-14rem)] overflow-y-auto list-none p-0 m-0">
                {rows.map((row) => {
                  const status = getCourseDisplayStatus(row)
                  const studentId = row.studentId ?? ''
                  const profileLoading = viewingProfileId === studentId
                  return (
                    <li
                      key={`${row.studentId}-${row.courseId}`}
                      className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg bg-white dark:bg-black/10"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-semibold text-defaulttextcolor">
                            {isCourseView ? row.studentName : row.courseName}
                          </div>
                          {isCourseView && row.positionName && (
                            <div className="text-[0.8125rem] text-defaulttextcolor/65 mt-0.5">
                              {row.positionName}
                            </div>
                          )}
                          {!isCourseView && row.categoryNames?.length > 0 && (
                            <div className="text-[0.8125rem] text-defaulttextcolor/65 mt-0.5">
                              {row.categoryNames.join(', ')}
                            </div>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.75rem] font-medium bg-danger/10 text-danger shrink-0">
                          <i className="ri-alert-line" aria-hidden />
                          {atRiskLabel(row.atRiskReason)}
                        </span>
                      </div>

                      <div className="mb-2">
                        <CompletionBar value={row.completionRate ?? 0} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] mb-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium ${statusBadgeClass(status)}`}>
                          {status}
                        </span>
                        <span className="text-defaulttextcolor/60">
                          Last accessed: {formatShortDate(row.lastAccessedAt)}
                        </span>
                      </div>

                      {isCourseView && studentId && (onPreviewStudent || onViewProfile) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-defaultborder/10">
                          {onPreviewStudent && (
                            <button
                              type="button"
                              className={EVAL_BTN_LIGHT}
                              onClick={() => onPreviewStudent(studentId, row.studentName)}
                            >
                              <i className="ri-eye-line" aria-hidden />
                              Preview student
                            </button>
                          )}
                          {onViewProfile && (
                            <button
                              type="button"
                              className={EVAL_BTN_OUTLINE_PRIMARY}
                              onClick={() => onViewProfile(studentId)}
                              disabled={profileLoading}
                              aria-busy={profileLoading}
                            >
                              {profileLoading ? (
                                <i className="ri-loader-4-line animate-spin motion-reduce:animate-none" aria-hidden />
                              ) : (
                                <i className="ri-user-line" aria-hidden />
                              )}
                              {profileLoading ? 'Opening…' : 'View profile'}
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="pt-2 border-t border-gray-200 dark:border-defaultborder/10">
              <button
                type="button"
                className={`${EVAL_BTN_LIGHT} w-full sm:w-auto`}
                data-hs-overlay="#at-risk-overlay-panel"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No selection</div>
        )}
      </div>
    </div>
    </>
  )
}

export default AtRiskOverlayPanel
