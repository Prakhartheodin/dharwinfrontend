"use client"

import React, { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { resolveEmployeeJobTitleLabel } from "@/shared/lib/employee-job-title"
import CandidateFeedbackPanel from "./CandidateFeedbackPanel"
import EmployeeAuditPanel from "./EmployeeAuditPanel"
import MatchingJobsPanel from "./MatchingJobsPanel"
import {
  getCandidateRecruiterFeedback,
  normalizeCandidateSkillsStructured,
  type CandidateDocument,
} from "@/shared/lib/api/employees"

const DatePicker = dynamic(() => import("react-datepicker").then((mod) => mod.default), { ssr: false })

// ponytail: HSOverlay shell kept; page remains client — extract is for maintainability / future dynamic().

const PREVIEW_TABS = [
  { id: "personal", label: "Personal Info", icon: "ri-user-line" },
  { id: "qualification", label: "Qualification", icon: "ri-book-line" },
  { id: "experience", label: "Experience", icon: "ri-briefcase-line" },
  { id: "skills", label: "Skills", icon: "ri-tools-line" },
  { id: "documents", label: "Documents", icon: "ri-file-line" },
  { id: "salary", label: "Salary Slips", icon: "ri-money-dollar-box-line" },
  { id: "notes", label: "Notes & Feedback", icon: "ri-file-text-line" },
  { id: "activity", label: "Activity", icon: "ri-history-line" },
  { id: "matching-jobs", label: "Matching Jobs", icon: "ri-target-line" },
] as const

function candidateDocumentCanView(doc: { key?: string; url?: string } | null | undefined): boolean {
  return !!(doc && (doc.key || doc.url))
}

function positionLabelFromRaw(raw: unknown): string {
  return resolveEmployeeJobTitleLabel(raw as any)
}

function trainingProgramsLabel(items: { name?: string }[] | undefined): string {
  if (!items?.length) return 'Not assigned';
  return items.map((x) => x.name).filter(Boolean).join(', ') || 'Not assigned'
}

function projectsAssignedLabel(items: { name?: string; status?: string }[] | undefined): string {
  if (!items?.length) return 'Not assigned'
  return (
    items
      .map((p) => {
        const n = p.name?.trim()
        if (!n) return ''
        return p.status ? `${n} (${p.status})` : n
      })
      .filter(Boolean)
      .join(', ') || 'Not assigned'
  )
}

/** Editable date field (admin only). Renders as clickable badge; click opens modal. */
function PersonalInfoDateField({
  label,
  value,
  onSave,
  saving,
  allowClear = false,
  badgeClassName,
  icon,
}: {
  label: string
  value: string | Date | null | undefined
  onSave: (value: string | null) => void
  saving: boolean
  allowClear?: boolean
  badgeClassName: string
  icon: string
}) {
  // Format/parse using LOCAL calendar fields, never UTC. react-datepicker emits a
  // Date at local midnight; toISOString() would roll it back a day east of UTC (IST).
  const toLocalIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const fromIso = (s: string) => { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd) }
  const iso = value ? new Date(value).toISOString().slice(0, 10) : ''
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState(iso)
  useEffect(() => {
    setLocal(value ? new Date(value).toISOString().slice(0, 10) : '')
  }, [value])
  const displayText = value
    ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Not set'
  const currentIso = value ? new Date(value).toISOString().slice(0, 10) : ''
  const hasChange = local !== currentIso
  const canSave = hasChange && (local.trim() || (allowClear && value))
  const handleSave = () => {
    if (allowClear && !local.trim()) {
      onSave(null)
    } else if (local.trim()) {
      onSave(local)
    }
    setOpen(false)
  }
  return (
    <>
      <button
        type="button"
        title={label}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded cursor-pointer border-0 bg-transparent ${badgeClassName} hover:opacity-90 transition-opacity`}
        onClick={() => setOpen(true)}
      >
        <i className={icon}></i>
        {displayText}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-md transition-opacity duration-200"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div
            className="bg-white dark:bg-bodybg rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.6)] border border-defaultborder dark:border-white/10 max-w-[340px] w-full overflow-hidden transition-transform duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] text-primary dark:bg-primary/20 dark:text-primary">
                    <i className={icon}></i>
                  </span>
                  <div>
                    <h3 className="text-[1.0625rem] font-semibold tracking-tight text-defaulttextcolor dark:text-white">{label}</h3>
                    <p className="text-xs text-textmuted dark:text-white/50 mt-0.5">Pick a date</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-textmuted hover:bg-defaultbackground dark:hover:bg-white/10 hover:text-defaulttextcolor dark:hover:text-white transition-colors"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <div className="date-picker-modal-cal [&_.react-datepicker]:!border-0 [&_.react-datepicker]:!rounded-xl [&_.react-datepicker]:!shadow-none [&_.react-datepicker]:!p-0 [&_.react-datepicker]:!bg-transparent [&_.react-datepicker__header]:!bg-transparent [&_.react-datepicker__header]:!border-b [&_.react-datepicker__header]:!border-defaultborder [&_.react-datepicker__header]:!pb-3 [&_.react-datepicker__header]:!mb-3 [&_.react-datepicker__current-month]:!text-defaulttextcolor [&_.react-datepicker__current-month]:!dark:text-white [&_.react-datepicker__current-month]:!text-sm [&_.react-datepicker__current-month]:!font-semibold [&_.react-datepicker__day-names]:!text-textmuted [&_.react-datepicker__day-names]:!dark:text-white/50 [&_.react-datepicker__day-names]:!text-[0.6875rem] [&_.react-datepicker__day-names]:!font-medium [&_.react-datepicker__day]:!w-9 [&_.react-datepicker__day]:!h-9 [&_.react-datepicker__day]:!leading-9 [&_.react-datepicker__day]:!text-defaulttextcolor [&_.react-datepicker__day]:!dark:text-white [&_.react-datepicker__day]:!text-[0.8125rem] [&_.react-datepicker__day]:!rounded-lg [&_.react-datepicker__day--selected]:!bg-primary [&_.react-datepicker__day--selected]:!text-white [&_.react-datepicker__day--selected]:!font-medium [&_.react-datepicker__day--keyboard-selected]:!bg-primary/15 [&_.react-datepicker__day--keyboard-selected]:!text-primary [&_.react-datepicker__day:hover]:!bg-primary/10 [&_.react-datepicker__day:hover]:!text-primary [&_.react-datepicker__day--outside-month]:!text-gray-300 [&_.react-datepicker__day--outside-month]:!dark:text-white/20 [&_.react-datepicker__navigation]:!top-1 [&_.react-datepicker__navigation-icon]:before:!border-defaulttextcolor [&_.react-datepicker__navigation-icon]:before:!dark:border-white/70 [&_.react-datepicker__month-dropdown]:!bg-white [&_.react-datepicker__month-dropdown]:!dark:bg-bodybg [&_.react-datepicker__year-dropdown]:!bg-white [&_.react-datepicker__year-dropdown]:!dark:bg-bodybg [&_.react-datepicker__today-button]:!bg-defaultbackground [&_.react-datepicker__today-button]:!dark:bg-white/5 [&_.react-datepicker__today-button]:!text-defaulttextcolor [&_.react-datepicker__today-button]:!dark:text-white [&_.react-datepicker__today-button]:!border-t [&_.react-datepicker__today-button]:!border-defaultborder [&_.react-datepicker__today-button]:!rounded-b-xl [&_.react-datepicker__today-button]:!py-2.5 [&_.react-datepicker__today-button]:!text-sm [&_.react-datepicker__today-button]:!font-medium [&_.react-datepicker__today-button]:!hover:bg-defaultbackground/80 [&_.react-datepicker__today-button]:!dark:hover:bg-white/10">
                <DatePicker
                  inline
                  selected={local ? fromIso(local) : null}
                  onChange={(d: Date | null) => setLocal(d ? toLocalIso(d) : '')}
                  dateFormat="yyyy-MM-dd"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  todayButton="Today"
                  calendarStartDay={1}
                  className="!border-0 !p-0 !w-full"
                  calendarClassName="date-picker-modal-cal"
                />
              </div>
            </div>
            <div className="px-6 py-4 flex flex-wrap items-center justify-end gap-3 border-t border-defaultborder dark:border-white/10 bg-defaultbackground/50 dark:bg-white/[0.02]">
              {allowClear && (local || value) && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center min-h-[2.5rem] px-4 py-2 text-sm font-medium rounded-lg border border-defaultborder dark:border-white/20 bg-white dark:bg-bodybg text-defaulttextcolor dark:text-white/90 hover:bg-defaultbackground dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-bodybg disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                  disabled={saving}
                  onClick={() => {
                    setLocal('')
                    onSave(null)
                    setOpen(false)
                  }}
                  title="Clear resign date (reactivate)"
                >
                  Clear date
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[2.5rem] min-w-[5.75rem] px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-bodybg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                disabled={saving || !canSave}
                onClick={handleSave}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export type EmployeePreviewPanelProps = {
  previewCandidate: any | null
  viewDetailTab: string
  setViewDetailTab: (id: string) => void
  previewMatchCount: number | null
  setPreviewMatchCount: (n: number | null) => void
  setPreviewCandidate: (c: any) => void
  canUpdateEmployee: boolean
  canEditJoiningDate: boolean
  canEditResignDate: boolean
  editHref: string | null
  handlePersonalInfoJoiningDateSave: (value: string | null) => void
  handlePersonalInfoResignDateSave: (value: string | null) => void
  personalInfoDateSaving: string | null
  skillRecommendLoading: boolean
  skillRecommendApplyLoading: boolean
  onOpenSkillRecommend: () => void
  actionError: string | null
  setActionError: (v: string | null) => void
  previewPanelDocumentsLoading: boolean
  previewPanelDocuments: any[] | null
  previewPanelSalarySlips: Array<{ month?: string; year?: number; key?: string; documentUrl?: string }> | null
  previewPanelSalarySlipsLoading: boolean
  handlePreviewPanelDocumentView: (index: number) => void
  handleSalarySlipView: (candidateId: string, index: number) => void
  openFeedbackModal: (candidate: any) => void
  handleAddNote: (id: string, candidate: any) => void
  renderAvatar: (candidate: any, className: string) => React.ReactNode
}

export default function EmployeePreviewPanel({
  previewCandidate,
  viewDetailTab,
  setViewDetailTab,
  previewMatchCount,
  setPreviewMatchCount,
  setPreviewCandidate,
  canUpdateEmployee,
  canEditJoiningDate,
  canEditResignDate,
  editHref,
  handlePersonalInfoJoiningDateSave,
  handlePersonalInfoResignDateSave,
  personalInfoDateSaving,
  skillRecommendLoading,
  skillRecommendApplyLoading,
  onOpenSkillRecommend,
  actionError,
  setActionError,
  previewPanelDocumentsLoading,
  previewPanelDocuments,
  previewPanelSalarySlips,
  previewPanelSalarySlipsLoading,
  handlePreviewPanelDocumentView,
  handleSalarySlipView,
  openFeedbackModal,
  handleAddNote,
  renderAvatar,
}: EmployeePreviewPanelProps) {
  const onTabListKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return
    const tabs = PREVIEW_TABS
    const idx = tabs.findIndex((t) => t.id === viewDetailTab)
    if (idx < 0) return
    e.preventDefault()
    let next = idx
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length
    if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length
    if (e.key === "Home") next = 0
    if (e.key === "End") next = tabs.length - 1
    const id = tabs[next].id
    setViewDetailTab(id)
    queueMicrotask(() => document.getElementById(`employee-preview-tab-${id}`)?.focus())
  }

  return (
      <div
        id="candidate-preview-panel"
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2 flex-1 min-w-0">
            <i className="ri-user-line text-primary text-base flex-shrink-0"></i>
            <span className="truncate">{previewCandidate?.name || 'Employee preview'}</span>
          </h6>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canUpdateEmployee && previewCandidate?.id && editHref ? (
              <Link
                href={editHref!}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              >
                <i className="ri-pencil-line text-sm" aria-hidden />
                Edit profile
              </Link>
            ) : null}
              <button
                type="button"
            className="hs-dropdown-toggle ti-btn flex-shrink-0 inline-flex min-h-11 min-w-11 items-center justify-center transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 rounded-md"
            data-hs-overlay="#candidate-preview-panel"
            onClick={() => {
              const el = document.querySelector('#candidate-preview-panel');
              if (el) (window as any).HSOverlay?.close(el);
              setPreviewCandidate(null);
              setViewDetailTab('personal');
              setPreviewMatchCount(null);
            }}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
              </button>
          </div>
        </div>
        <div className="ti-offcanvas-body !p-4 overflow-y-auto">
          {previewCandidate ? (
            <>
              {/* Candidate header summary */}
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-defaultborder/10">
                <div className="avatar avatar-lg avatar-rounded flex-shrink-0 overflow-hidden">
                  {renderAvatar(previewCandidate, "w-full h-full rounded-full")}
                </div>
                    <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{previewCandidate.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{previewCandidate.email}</p>
                      {(previewCandidate._raw?.employeeId) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Employee ID: {previewCandidate._raw.employeeId}</p>
                      )}
                      {(previewCandidate.bio || previewCandidate._raw?.shortBio) && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{previewCandidate.bio || previewCandidate._raw?.shortBio}</p>
                      )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {((previewCandidate.isProfileCompleted ?? previewCandidate._raw?.isProfileCompleted ?? 0) < 100) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded">
                        <i className="ri-pie-chart-line"></i>
                        {previewCandidate.isProfileCompleted ?? previewCandidate._raw?.isProfileCompleted ?? 0}% complete
                      </span>
                    )}
                    {canEditJoiningDate ? (
                      <PersonalInfoDateField
                        label="Joining Date"
                        value={previewCandidate._raw?.joiningDate}
                        onSave={handlePersonalInfoJoiningDateSave}
                        saving={personalInfoDateSaving === 'joining'}
                        badgeClassName="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        icon="ri-calendar-check-line"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded" title="Joining Date">
                        <i className="ri-calendar-check-line"></i>
                        {previewCandidate._raw?.joiningDate ? new Date(previewCandidate._raw.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                      </span>
                    )}
                    {canEditResignDate ? (
                      <PersonalInfoDateField
                        label="Resign Date"
                        value={previewCandidate._raw?.resignDate}
                        onSave={handlePersonalInfoResignDateSave}
                        saving={personalInfoDateSaving === 'resign'}
                        allowClear
                        badgeClassName="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                        icon="ri-calendar-close-line"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded" title="Resign Date">
                        <i className="ri-calendar-close-line"></i>
                        {previewCandidate._raw?.resignDate ? new Date(previewCandidate._raw.resignDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

                            {/* Tabs */}
              <div className="min-w-0 bg-white dark:bg-gray-800 px-4 sm:px-6 lg:px-8 py-4">
                <div className="mb-4 min-w-0 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
                  <nav
                    role="tablist"
                    aria-label="Profile sections"
                    className="-mb-px flex w-full min-w-max flex-nowrap items-end gap-x-2 gap-y-2 pb-px sm:gap-x-3 lg:gap-x-1 lg:px-1"
                    onKeyDown={onTabListKeyDown}
                  >
                    {PREVIEW_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        id={`employee-preview-tab-${tab.id}`}
                        type="button"
                        role="tab"
                        aria-selected={viewDetailTab === tab.id}
                        aria-controls={`employee-preview-panel-${tab.id}`}
                        tabIndex={viewDetailTab === tab.id ? 0 : -1}
                        onClick={() => setViewDetailTab(tab.id)}
                        className={`inline-flex shrink-0 flex-nowrap items-center gap-1.5 border-b-2 px-2 py-2.5 text-left text-sm font-medium sm:gap-2 sm:px-2.5 lg:flex-1 lg:min-h-[2.75rem] lg:justify-center lg:px-1.5 lg:text-center xl:px-2 ${
                          viewDetailTab === tab.id
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300"
                        }`}
                      >
                        <i className={`${tab.icon} shrink-0 text-base sm:text-[1.05rem]`} aria-hidden />
                        <span className="whitespace-nowrap text-xs font-medium leading-tight md:text-[0.8125rem] lg:text-xs xl:text-sm">
                          {tab.label}
                        </span>
                        {tab.id === "matching-jobs" && previewMatchCount != null && previewMatchCount > 0 ? (
                          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none text-primary">
                            {previewMatchCount}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab content */}
                <div className="min-h-[300px] sm:min-h-[400px]">
                  {viewDetailTab === 'personal' && (
                    <div role="tabpanel" id="employee-preview-panel-personal" aria-labelledby="employee-preview-tab-personal" className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Personal Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.name || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.email || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Company work email
                          </label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {(previewCandidate._raw?.companyAssignedEmail as string | undefined)?.trim() || "—"}
                          </p>
                          {(previewCandidate._raw?.companyEmailProvider as string | undefined) ? (
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              Provider: {String(previewCandidate._raw.companyEmailProvider)}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.phone || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Education</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.education || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Experience (years)</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.experience ?? '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{positionLabelFromRaw(previewCandidate._raw)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Compensation</label>
                          <p className="mt-1">
                            {(() => {
                              const comp = previewCandidate._raw?.compensationType as string | undefined
                              const unpaid = comp === 'unpaid'
                              return (
                                <span
                                  className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
                                    unpaid
                                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                                      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {unpaid ? 'Unpaid' : 'Paid'}
                                </span>
                              )
                            })()}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employment type</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {(previewCandidate._raw?.employmentType as string | undefined) || '—'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Training programs</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {trainingProgramsLabel(previewCandidate._raw?.assignedTrainingPrograms)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Projects</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {projectsAssignedLabel(previewCandidate._raw?.assignedProjects)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Short Bio</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.bio || previewCandidate._raw?.shortBio || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {viewDetailTab === 'qualification' && (
                    <div role="tabpanel" id="employee-preview-panel-qualification" aria-labelledby="employee-preview-tab-qualification" className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Education & Qualifications</h4>
                      {Array.isArray(previewCandidate._raw?.qualifications) && previewCandidate._raw.qualifications.length > 0 ? (
                        previewCandidate._raw.qualifications.map((qual: any, index: number) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Education #{index + 1}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Degree</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{qual?.degree || '-'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Institute</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{qual?.institute || '-'}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <i className="ri-book-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                          <p className="text-gray-500 dark:text-gray-400">No qualifications listed.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {viewDetailTab === 'experience' && (
                    <div role="tabpanel" id="employee-preview-panel-experience" aria-labelledby="employee-preview-tab-experience" className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Work Experience</h4>
                      {Array.isArray(previewCandidate._raw?.experiences) && previewCandidate._raw.experiences.length > 0 ? (
                        previewCandidate._raw.experiences.map((exp: any, index: number) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Experience #{index + 1}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.company || '-'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.role || '-'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.startDate ? new Date(exp.startDate).toLocaleDateString() : '-'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.endDate ? new Date(exp.endDate).toLocaleDateString() : (exp?.currentlyWorking ? 'Present' : '-')}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <i className="ri-briefcase-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                          <p className="text-gray-500 dark:text-gray-400">No work experience listed.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {viewDetailTab === 'skills' && (
                    <div role="tabpanel" id="employee-preview-panel-skills" aria-labelledby="employee-preview-tab-skills" className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3 dark:border-white/10">
                        <div className="min-w-0 flex items-center gap-2">
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-0">Skills</h4>
                          {!!previewCandidate.skillsStructured?.length && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {previewCandidate.skillsStructured.length}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={!previewCandidate?.id || skillRecommendLoading || skillRecommendApplyLoading}
                          onClick={onOpenSkillRecommend}
                          aria-label={
                            skillRecommendLoading || skillRecommendApplyLoading
                              ? 'Generating skill suggestions'
                              : 'Suggest skills from a job role using AI'
                          }
                          title="Suggest skills from a job role using AI"
                          className="group relative shrink-0 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 via-violet-500/10 to-indigo-500/10 py-1.5 pl-2.5 pr-1.5 text-[0.8125rem] font-medium text-primary shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-transparent hover:from-primary hover:via-violet-500 hover:to-indigo-500 hover:text-white hover:shadow-md hover:shadow-primary/25 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 dark:border-primary/35 dark:from-primary/20 dark:via-violet-500/15 dark:to-indigo-500/20 dark:text-white dark:focus-visible:ring-offset-gray-950"
                        >
                          {skillRecommendLoading || skillRecommendApplyLoading ? (
                            <>
                              <span
                                className="inline-block h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
                                aria-hidden
                              />
                              <span className="leading-none">Suggesting</span>
                              <span className="ms-0.5 inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary dark:bg-white/15 dark:text-white">
                                AI
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="relative flex items-center justify-center">
                                <i className="ri-sparkling-2-fill text-base leading-none transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" aria-hidden />
                                <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden />
                              </span>
                              <span className="leading-none">Suggest Skills</span>
                              <span className="ms-0.5 inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary transition-colors group-hover:bg-white/20 group-hover:text-white dark:bg-white/15 dark:text-white">
                                AI
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                      {previewCandidate.skillsStructured?.length ? (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                          {previewCandidate.skillsStructured.map((row: { name: string; level: string; category?: string }, index: number) => {
                            const lvl = String(row.level || 'Intermediate')
                            const lvlKey = lvl.toLowerCase()
                            const meta =
                              lvlKey.includes('expert') ? { pct: 100, dots: 4, barClass: 'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500', chipClass: 'bg-fuchsia-500/10 text-fuchsia-600 ring-fuchsia-500/20 dark:bg-fuchsia-500/15 dark:text-fuchsia-300' }
                              : lvlKey.includes('advanc') ? { pct: 80, dots: 3, barClass: 'bg-gradient-to-r from-primary to-violet-500', chipClass: 'bg-primary/10 text-primary ring-primary/20 dark:bg-primary/20 dark:text-white' }
                              : lvlKey.includes('intermediate') || lvlKey.includes('mid') ? { pct: 55, dots: 2, barClass: 'bg-gradient-to-r from-sky-500 to-cyan-500', chipClass: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-300' }
                              : lvlKey.includes('begin') || lvlKey.includes('entry') || lvlKey.includes('junior') ? { pct: 30, dots: 1, barClass: 'bg-gradient-to-r from-amber-500 to-orange-500', chipClass: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300' }
                              : { pct: 50, dots: 2, barClass: 'bg-gradient-to-r from-gray-400 to-gray-500', chipClass: 'bg-gray-200 text-gray-700 ring-gray-300 dark:bg-gray-700 dark:text-gray-200' }
                            return (
                              <div
                                key={`${row.name}-${index}`}
                                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-primary/40"
                              >
                                <span className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-primary/5 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-primary/15" aria-hidden />
                                <div className="relative flex items-start justify-between gap-2">
                                  <span className="text-sm font-semibold leading-snug text-gray-900 dark:text-white line-clamp-2" title={row.name}>
                                    {row.name}
                                  </span>
                                  <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${meta.chipClass}`}>
                                    {lvl}
                                  </span>
                                </div>
                                <div className="relative mt-3">
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/60">
                                    <div
                                      className={`h-full rounded-full ${meta.barClass} transition-[width] duration-500 ease-out`}
                                      style={{ width: `${meta.pct}%` }}
                                      aria-hidden
                                    />
                                  </div>
                                  <div className="mt-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-0.5" aria-hidden>
                                      {[1, 2, 3, 4].map((d) => (
                                        <span
                                          key={d}
                                          className={`h-1 w-1.5 rounded-sm ${d <= meta.dots ? 'bg-primary dark:bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                                        />
                                      ))}
                                    </div>
                                    {row.category ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate" title={row.category}>
                                        <i className="ri-price-tag-3-line text-xs" aria-hidden />
                                        <span className="truncate">{row.category}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-gray-400 dark:text-gray-500">Uncategorized</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="relative overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gradient-to-br from-gray-50 via-white to-primary/[0.04] py-10 px-6 text-center dark:border-gray-700 dark:from-gray-800/40 dark:via-gray-900 dark:to-primary/10">
                          <span className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" aria-hidden />
                          <span className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/20" aria-hidden />
                          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-violet-500/10 to-indigo-500/10 ring-1 ring-primary/15 dark:from-primary/20 dark:via-violet-500/15 dark:to-indigo-500/20 dark:ring-primary/25">
                            <i className="ri-tools-fill text-2xl text-primary" aria-hidden />
                          </div>
                          <h5 className="relative mt-4 text-sm font-semibold text-gray-900 dark:text-white">No skills listed yet</h5>
                          <p className="relative mx-auto mt-1 max-w-xs text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            Use <span className="font-semibold text-primary">Suggest Skills</span> above to auto-fill from a target role and experience level.
                          </p>
                          <div className="relative mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary/80 dark:text-primary/75">
                            <i className="ri-arrow-up-line animate-bounce" aria-hidden />
                            <span>Tap the sparkle button</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {viewDetailTab === 'documents' && (
                    <div role="tabpanel" id="employee-preview-panel-documents" aria-labelledby="employee-preview-tab-documents" className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Documents</h4>
                      {actionError && (
                        <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm flex justify-between items-center">
                          <span>{actionError}</span>
                          <button type="button" onClick={() => setActionError(null)} className="shrink-0 ml-2 text-danger/80 hover:text-danger">×</button>
                        </div>
                      )}
                      {previewPanelDocumentsLoading ? (
                        <div className="flex items-center gap-2 py-6 text-sm text-gray-500 dark:text-gray-400">
                          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Loading documents…
                        </div>
                      ) : (() => {
                        const docsList =
                          previewPanelDocuments ??
                          (Array.isArray(previewCandidate._raw?.documents) ? previewCandidate._raw.documents : [])
                        return Array.isArray(docsList) && docsList.length > 0 ? (
                        <div className="space-y-3">
                          {docsList.map((doc: CandidateDocument & { label?: string; originalName?: string }, index: number) => {
                            const label = doc?.label || doc?.originalName || `Document ${index + 1}`
                            const viewable = candidateDocumentCanView(doc)
                            return (
                            <div key={index} className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <p className="font-medium text-gray-900 dark:text-white truncate min-w-0 flex-1">{label}</p>
                              <button
                                type="button"
                                disabled={!viewable}
                                title={!viewable ? 'File is not linked to storage — re-upload required' : 'Open document'}
                                className={`ti-btn ti-btn-sm !w-auto !h-auto !min-h-[1.75rem] py-1.5 px-3 shrink-0 whitespace-nowrap ${
                                  viewable ? 'ti-btn-primary' : 'ti-btn-outline text-gray-400 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                                }`}
                                onClick={() => {
                                  if (viewable) handlePreviewPanelDocumentView(index)
                                }}
                              >
                                <i className="ri-external-link-line me-1"></i>View
                              </button>
                            </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <i className="ri-file-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                          <p className="text-gray-500 dark:text-gray-400">No documents uploaded.</p>
                        </div>
                      )
                      })()}
                    </div>
                  )}

                  {viewDetailTab === 'salary' && (
                    <div role="tabpanel" id="employee-preview-panel-salary" aria-labelledby="employee-preview-tab-salary" className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Salary Slips</h4>
                      {previewPanelSalarySlipsLoading ? (
                        <div className="flex items-center gap-2 py-6 text-sm text-gray-500 dark:text-gray-400">
                          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Loading salary slips…
                        </div>
                      ) : (() => {
                        const salarySlips =
                          previewPanelSalarySlips ??
                          (Array.isArray(previewCandidate._raw?.salarySlips) ? previewCandidate._raw.salarySlips : [])
                        return Array.isArray(salarySlips) && salarySlips.length > 0 ? (
                        <div className="space-y-3">
                          {salarySlips.map((slip: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <span className="text-sm text-gray-900 dark:text-white truncate min-w-0 flex-1">{slip?.month ?? ''} {slip?.year ?? ''}</span>
                              {(slip?.key || slip?.documentUrl || slip?.url) ? (
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-sm ti-btn-primary !w-auto !h-auto !min-h-[1.75rem] py-1.5 px-3 shrink-0 whitespace-nowrap inline-flex items-center"
                                  onClick={() => {
                                    const cid = previewCandidate?.id ?? previewCandidate?._raw?._id
                                    if (cid) handleSalarySlipView(cid, index)
                                  }}
                                >
                                  <i className="ri-external-link-line me-1"></i>View
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <i className="ri-money-dollar-box-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                          <p className="text-gray-500 dark:text-gray-400">No salary slips uploaded.</p>
                        </div>
                      )
                      })()}
                    </div>
                  )}

                  {viewDetailTab === 'matching-jobs' && previewCandidate?.id && (
                    <div role="tabpanel" id="employee-preview-panel-matching-jobs" aria-labelledby="employee-preview-tab-matching-jobs" className="space-y-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Active jobs ranked by skill overlap with this employee.
                      </p>
                      <MatchingJobsPanel
                        candidateId={previewCandidate.id}
                        skillCount={
                          normalizeCandidateSkillsStructured(previewCandidate._raw?.skills ?? previewCandidate.skills).length ||
                          previewCandidate.skillsStructured?.length ||
                          0
                        }
                        onGoToSkills={() => setViewDetailTab('skills')}
                        onMatchesLoaded={setPreviewMatchCount}
                      />
                    </div>
                  )}

                  {viewDetailTab === 'notes' && (
                    <div role="tabpanel" id="employee-preview-panel-notes" aria-labelledby="employee-preview-tab-notes">
                    <CandidateFeedbackPanel
                      candidate={previewCandidate}
                      onOpenFeedback={() => {
                        if (!previewCandidate) return
                        openFeedbackModal(previewCandidate)
                      }}
                      onOpenNotes={() => {
                        if (!previewCandidate) return
                        handleAddNote(previewCandidate.id, previewCandidate)
                        setPreviewCandidate(null)
                        setViewDetailTab('personal')
                      }}
                    />
                  </div>
                  )}

                  {viewDetailTab === 'activity' && previewCandidate?.id && (
                    <div role="tabpanel" id="employee-preview-panel-activity" aria-labelledby="employee-preview-tab-activity">
                      <EmployeeAuditPanel entityId={previewCandidate.id} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-gray-200 pt-4 dark:border-defaultborder/10 sm:flex-row">
                {viewDetailTab === "notes" && previewCandidate ? (
                  <>
                    <button
                      type="button"
                      className="ti-btn ti-btn-warning !mb-0 flex-1 !h-auto !w-auto !min-h-[2.75rem] !px-4 whitespace-nowrap inline-flex items-center justify-center gap-1.5"
                      onClick={() => openFeedbackModal(previewCandidate)}
                    >
                      <i className="ri-feedback-line text-base" aria-hidden />
                      <span>
                        {getCandidateRecruiterFeedback(previewCandidate).feedback
                          ? "Update feedback"
                          : "Add feedback"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary !mb-0 flex-1 !h-auto !w-auto !min-h-[2.75rem] !px-4 whitespace-nowrap inline-flex items-center justify-center gap-1.5"
                      onClick={() => {
                        handleAddNote(previewCandidate.id, previewCandidate)
                        setPreviewCandidate(null)
                        setViewDetailTab("personal")
                      }}
                    >
                      <i className="ri-file-text-line text-base" aria-hidden />
                      <span>Open notes</span>
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className={`ti-btn ti-btn-light !mb-0 !h-auto !w-auto !min-h-[2.75rem] !px-4 whitespace-nowrap border border-gray-200 dark:border-defaultborder/20 inline-flex items-center justify-center ${
                    viewDetailTab === "notes" && previewCandidate ? "sm:flex-1" : "w-full"
                  }`}
                  data-hs-overlay="#candidate-preview-panel"
                  onClick={() => {
                    const el = document.querySelector("#candidate-preview-panel");
                    if (el) (window as any).HSOverlay?.close(el);
                    setPreviewCandidate(null);
                    setViewDetailTab("personal");
                    setPreviewMatchCount(null);
                  }}
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No employee selected</div>
          )}
            </div>
          </div>

  )
}
