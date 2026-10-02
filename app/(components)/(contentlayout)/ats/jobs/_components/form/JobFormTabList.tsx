'use client'

import React, { type KeyboardEvent } from 'react'
import { JOB_FORM_TABS, type JobFormTabKey } from './jobFormConstants'
import type { JobFormTabCompletion } from './jobFormTabCompletion'

const COMPLETION_LABEL: Record<JobFormTabCompletion, string> = {
  complete: 'Ready',
  incomplete: 'In progress',
  optional: 'Optional',
}

export function JobFormTabList({
  activeTab,
  onTabChange,
  tabCompletion,
}: {
  activeTab: JobFormTabKey
  onTabChange: (tab: JobFormTabKey) => void
  tabCompletion: Record<JobFormTabKey, JobFormTabCompletion>
}): React.JSX.Element {
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabKey: JobFormTabKey) => {
    const currentIndex = JOB_FORM_TABS.findIndex((t) => t.key === tabKey)
    if (currentIndex < 0) return
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % JOB_FORM_TABS.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + JOB_FORM_TABS.length) % JOB_FORM_TABS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = JOB_FORM_TABS.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    onTabChange(JOB_FORM_TABS[nextIndex].key)
    requestAnimationFrame(() => {
      document.getElementById(`${JOB_FORM_TABS[nextIndex].key}-tab`)?.focus()
    })
  }

  return (
    <div className="jobs-form-tabs border-b border-defaultborder/60 dark:border-white/10">
      <div className="jobs-surface-x pt-2 pb-0">
        <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 mb-2 m-0">
          Work across tabs in any order. Save when you are ready.
        </p>
        <nav className="flex overflow-x-auto gap-1 -mb-px" role="tablist" aria-label="Job form sections">
          {JOB_FORM_TABS.map((tab) => {
            const selected = activeTab === tab.key
            const completion = tabCompletion[tab.key]
            const completionPhrase = COMPLETION_LABEL[completion].toLowerCase()
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`${tab.key}-tab`}
                aria-selected={selected}
                aria-controls={`${tab.key}-panel`}
                aria-label={`${tab.label}, ${completionPhrase}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onTabChange(tab.key)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.key)}
                className={`jobs-form-tab py-2 px-3 sm:px-4 inline-flex items-center gap-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  selected
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
                }`}
              >
                <i className={tab.icon} aria-hidden />
                <span aria-hidden="true">{tab.label}</span>
                <span
                  className={`jobs-form-tab__chip jobs-form-tab__chip--${completion}`}
                  aria-hidden="true"
                >
                  {COMPLETION_LABEL[completion]}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
