"use client"
import React from 'react'

export interface NotificationsOffBadgeProps {
  /** Shown on hover / to screen readers. Defaults to the meeting-invitation wording. */
  title?: string
  className?: string
}

const DEFAULT_TITLE =
  'This user has turned off meeting invitation emails in their notification preferences. ' +
  'They are on the invite list but will not receive the invitation by email.'

/**
 * Marks an invitee whose own notification preferences suppress meeting invitation email.
 *
 * Without this the invite list looks the same either way: the organiser adds someone, sees
 * their address listed, and has no way to know the send is dropped before it ever reaches
 * SMTP. That gap is what let a muted invitee go a month without invitations while the portal
 * showed them correctly invited.
 */
export default function NotificationsOffBadge({ title, className = '' }: NotificationsOffBadgeProps) {
  return (
    <span
      title={title || DEFAULT_TITLE}
      className={
        'inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 ' +
        'px-1.5 py-px text-[0.65rem] font-medium leading-normal text-amber-700 ' +
        'dark:border-amber-400/40 dark:text-amber-300 ' +
        className
      }
    >
      <i className="ri-notification-off-line text-[0.7rem]" aria-hidden />
      <span>Email off</span>
    </span>
  )
}
