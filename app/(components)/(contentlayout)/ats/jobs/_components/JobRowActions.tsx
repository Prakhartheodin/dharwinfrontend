'use client'

import React from 'react'
import Link from 'next/link'
import type { DisplayJob } from '@/shared/lib/ats/jobMappers'

const tableIconBtn =
  'ti-btn ti-btn-icon ti-btn-sm ti-btn-light !h-9 !w-9 !min-h-9 !min-w-9 !p-0 !text-defaulttextcolor/80 hover:!bg-gray-100 dark:hover:!bg-white/10'
const cardIconBtn =
  'ti-btn ti-btn-icon ti-btn-light !min-h-11 !min-w-11 !h-11 !w-11 !p-0 !text-defaulttextcolor/80 hover:!bg-gray-100 dark:hover:!bg-white/10'

export interface JobRowActionsProps {
  job: DisplayJob
  layout?: 'row' | 'card'
  canEdit: boolean
  isSalesAgent: boolean
  bookmarked: boolean
  bookmarkToggling: boolean
  calling: boolean
  canCall: boolean
  callDisabledReason: string
  onBookmark: () => void
  onCall: () => void
  onShare: () => void
}

type ActionItem = {
  key: string
  label: string
  icon: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  hidden?: boolean
}

export function JobRowActions({
  job,
  layout = 'row',
  canEdit,
  isSalesAgent,
  bookmarked,
  bookmarkToggling,
  calling,
  canCall,
  callDisabledReason,
  onBookmark,
  onCall,
  onShare,
}: JobRowActionsProps): React.JSX.Element {
  const items: ActionItem[] = [
    {
      key: 'edit',
      label: 'Edit job',
      icon: 'ri-pencil-line',
      href: `/ats/jobs/edit/${job.id}`,
      hidden: !(canEdit && !isSalesAgent && job.jobOrigin !== 'external'),
    },
    {
      key: 'bookmark',
      label: bookmarked ? 'View notes' : 'Bookmark job',
      icon: bookmarked ? 'ri-bookmark-fill' : 'ri-bookmark-line',
      onClick: onBookmark,
      disabled: bookmarkToggling,
    },
    {
      key: 'call',
      label: calling ? 'Calling…' : canCall ? 'Verify job post (recruiter call)' : callDisabledReason,
      icon: 'ri-phone-line',
      onClick: onCall,
      disabled: !canCall || calling,
      hidden: job.jobOrigin === 'external',
    },
    {
      key: 'share',
      label: 'Share job',
      icon: 'ri-share-line',
      onClick: onShare,
    },
  ]

  const visible = items.filter((i) => !i.hidden)
  const primary = visible.slice(0, 3)
  const overflow = visible.slice(3)

  const ghostIcon = layout === 'card' ? cardIconBtn : tableIconBtn

  const renderButton = (item: ActionItem, inMenu = false) => {
    const className = inMenu
      ? 'ti-dropdown-item !py-2 !px-3 !text-[0.8125rem] w-full text-left inline-flex items-center gap-2'
      : `${ghostIcon} hs-tooltip-toggle`
    const inner = (
      <>
        <i className={`${item.icon} ${inMenu ? '' : ''}`} aria-hidden />
        {inMenu ? <span>{item.label}</span> : null}
      </>
    )

    if (item.href) {
      return (
        <Link key={item.key} href={item.href} className={className} aria-label={item.label}>
          {inner}
          {!inMenu ? (
            <span
              className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
              role="tooltip"
            >
              {item.label}
            </span>
          ) : null}
        </Link>
      )
    }

    return (
      <div key={item.key} className={inMenu ? '' : 'hs-tooltip ti-main-tooltip'}>
        <button
          type="button"
          className={className}
          onClick={item.onClick}
          disabled={item.disabled}
          aria-label={item.label}
        >
          {inner}
          {!inMenu ? (
            <span
              className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
              role="tooltip"
            >
              {item.label}
            </span>
          ) : null}
        </button>
      </div>
    )
  }

  const wrapClass =
    layout === 'card'
      ? 'flex items-center justify-end gap-1.5'
      : 'flex items-center justify-center gap-1'

  return (
    <div className={wrapClass}>
      {primary.map((item) => renderButton(item))}
      {overflow.length > 0 ? (
        <div className="hs-dropdown ti-dropdown relative">
          <button
            type="button"
            className={`${ghostIcon} ti-dropdown-toggle`}
            aria-label="More actions"
            aria-haspopup="menu"
          >
            <i className="ri-more-2-fill" aria-hidden />
          </button>
          <ul className="hs-dropdown-menu ti-dropdown-menu hidden min-w-[10rem]" role="menu">
            {overflow.map((item) => (
              <li key={item.key} role="none">
                {item.href ? (
                  <Link href={item.href} className="ti-dropdown-item !py-2 !px-3 !text-[0.8125rem] w-full text-left inline-flex items-center gap-2" role="menuitem">
                    <i className={item.icon} aria-hidden />
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="ti-dropdown-item !py-2 !px-3 !text-[0.8125rem] w-full text-left inline-flex items-center gap-2"
                    role="menuitem"
                    onClick={item.onClick}
                    disabled={item.disabled}
                  >
                    <i className={item.icon} aria-hidden />
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
