'use client'

import React, { type ReactNode } from 'react'
import type { JobFormTabKey } from './jobFormConstants'

export function JobFormPanel({
  tabKey,
  activeTab,
  labelledBy,
  children,
}: {
  tabKey: JobFormTabKey
  activeTab: JobFormTabKey
  labelledBy: string
  children: ReactNode
}): React.JSX.Element | null {
  if (activeTab !== tabKey) return null
  return (
    <div
      id={`${tabKey}-panel`}
      role="tabpanel"
      aria-labelledby={labelledBy}
      className="box-body jobs-surface-x jobs-form-panel jobs-form-panel-scroll space-y-5 motion-safe:animate-[jobsFormPanelIn_0.15s_ease-out]"
    >
      {children}
    </div>
  )
}
