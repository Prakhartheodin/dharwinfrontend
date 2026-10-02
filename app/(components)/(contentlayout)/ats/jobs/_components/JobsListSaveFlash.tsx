'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const MESSAGES: Record<string, string> = {
  created: 'Job created. It appears in your list below.',
  updated: 'Changes saved.',
}

export function JobsListSaveFlash(): React.JSX.Element | null {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const saved = searchParams.get('saved')
  const [visible, setVisible] = useState(false)
  const message = saved ? MESSAGES[saved] : undefined

  useEffect(() => {
    if (!message) {
      setVisible(false)
      return
    }
    setVisible(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('saved')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    const timer = window.setTimeout(() => setVisible(false), 6000)
    return () => window.clearTimeout(timer)
  }, [message, pathname, router, searchParams])

  if (!visible || !message) return null

  return (
    <div className="jobs-list-save-flash jobs-surface-x" role="status" aria-live="polite">
      <p className="jobs-list-save-flash__text m-0">
        <i className="ri-checkbox-circle-fill text-success me-2" aria-hidden />
        {message}
      </p>
      <button
        type="button"
        className="jobs-list-save-flash__dismiss"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        <i className="ri-close-line" aria-hidden />
      </button>
    </div>
  )
}
