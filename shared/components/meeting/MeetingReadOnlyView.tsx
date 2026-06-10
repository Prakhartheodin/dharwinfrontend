"use client"
import React from 'react'

export interface ReadOnlyRow {
  label: string
  /** Rendered value; falsy values show an em dash. */
  value?: React.ReactNode
}

export interface MeetingReadOnlyViewProps {
  /** Short banner explaining why the record is read-only. */
  banner: string
  rows: ReadOnlyRow[]
  /** Optional invite/participant emails to list. */
  invites?: string[]
  notes?: string
}

/**
 * Read-only presentation of an interview/meeting. Shown once the record reaches
 * a terminal state (ended/completed/cancelled) so the data is viewable but not
 * editable. Per the `read-only-distinction` UX rule, this is visually distinct
 * from disabled inputs: plain labelled values, not greyed-out form controls.
 */
export default function MeetingReadOnlyView({ banner, rows, invites, notes }: MeetingReadOnlyViewProps) {
  const cleanInvites = (invites ?? []).map((e) => e.trim()).filter(Boolean)
  return (
    <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2.5 text-sm text-amber-700 dark:text-amber-300"
      >
        <i className="ri-lock-2-line text-base shrink-0" aria-hidden />
        <span>{banner}</span>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map((r, i) => (
          <div key={i} className="min-w-0">
            <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-textmuted dark:text-white/50">
              {r.label}
            </dt>
            <dd className="mt-0.5 break-words text-sm text-defaulttextcolor dark:text-white">
              {r.value || <span className="text-textmuted dark:text-white/40">—</span>}
            </dd>
          </div>
        ))}
      </dl>

      {cleanInvites.length ? (
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-textmuted dark:text-white/50 mb-1.5">
            Participants &amp; invites
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {cleanInvites.map((email, i) => (
              <li
                key={i}
                className="inline-flex items-center rounded-md border border-defaultborder/70 bg-light/40 px-2 py-0.5 text-xs text-defaulttextcolor dark:border-defaultborder/20 dark:bg-white/[0.03] dark:text-white"
              >
                {email}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {notes && notes.trim() ? (
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-textmuted dark:text-white/50 mb-1">
            Notes
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-defaulttextcolor dark:text-white">{notes}</p>
        </div>
      ) : null}
    </div>
  )
}
