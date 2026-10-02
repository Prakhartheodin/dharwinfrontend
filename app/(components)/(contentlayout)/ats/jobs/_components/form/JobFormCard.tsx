'use client'

import React, { type ReactNode } from 'react'

export function JobFormCard({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="box custom-box jobs-form-box mb-0 overflow-hidden">
      {children}
    </div>
  )
}
