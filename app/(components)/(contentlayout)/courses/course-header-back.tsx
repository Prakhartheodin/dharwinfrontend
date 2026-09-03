"use client"

import React from "react"
import Link from "next/link"

/**
 * Rectangle back control used in course detail and learn headers.
 */
export function CourseHeaderBack({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-sm text-[0.75rem] font-medium text-[#1c1d1f] dark:text-white border border-[#1c1d1f]/25 dark:border-white/25 hover:bg-[#1c1d1f] hover:text-white dark:hover:bg-white dark:hover:text-[#1c1d1f] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1d1f]/40"
    >
      <i className="ti ti-arrow-left text-[0.875rem]" aria-hidden />
      <span>Back</span>
    </Link>
  )
}
