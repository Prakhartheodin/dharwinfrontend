"use client"
import React, { useMemo } from 'react'

export interface ParticipantUser {
  id: string
  name?: string
  email: string
}

export interface ParticipantInvitesFieldProps {
  /** Current invite emails (system participants + guest emails), controlled. */
  invites: string[]
  onChange: (next: string[]) => void
  /** System users available to add as participants. */
  users: ParticipantUser[]
  usersLoading?: boolean
  usersError?: string | null
  onReloadUsers?: () => void
  /** Unique prefix so multiple instances don't collide on element ids. */
  idPrefix?: string
}

const norm = (s: string) => s.trim().toLowerCase()

/**
 * Reusable "Participants & invites" editor for interview/meeting overlays.
 * Two ways to add a recipient, both emailed like a normal invite on save:
 *   1. Pick an existing system user from the dropdown (their email is added).
 *   2. Type a guest email that isn't in the system (Add email).
 * The backend emails only newly-added entries on update, so re-saving an
 * unchanged list never re-spams existing invitees.
 */
export default function ParticipantInvitesField({
  invites,
  onChange,
  users,
  usersLoading,
  usersError,
  onReloadUsers,
  idPrefix = 'participant',
}: ParticipantInvitesFieldProps) {
  const invitedSet = useMemo(() => new Set(invites.map(norm).filter(Boolean)), [invites])
  const available = useMemo(
    () => users.filter((u) => u.email && !invitedSet.has(norm(u.email))),
    [users, invitedSet]
  )

  const addEmail = (email: string) => {
    const e = email.trim()
    if (!e || invitedSet.has(norm(e))) return
    onChange([...invites, e])
  }

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={`${idPrefix}-user-picker`}
          className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5"
        >
          Add participant from users
          <span className="text-xs font-normal text-defaulttextcolor/70 dark:text-white/70 ml-1">
            — they get an email invite like everyone else
          </span>
        </label>
        {usersError ? (
          <p className="text-xs text-danger mb-1.5" role="alert">
            {usersError}
            {onReloadUsers ? (
              <button type="button" className="ml-1.5 underline" onClick={onReloadUsers}>
                Retry
              </button>
            ) : null}
          </p>
        ) : null}
        <select
          id={`${idPrefix}-user-picker`}
          className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          value=""
          disabled={usersLoading}
          onChange={(e) => {
            if (e.target.value) addEmail(e.target.value)
            e.target.value = ''
          }}
        >
          <option value="">
            {usersLoading
              ? 'Loading users...'
              : available.length
                ? 'Select a user to invite'
                : 'No more users to add'}
          </option>
          {available.map((u) => (
            <option key={u.id} value={u.email}>
              {u.name ? `${u.name} — ${u.email}` : u.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
          Email invites
          <span className="text-xs font-normal text-defaulttextcolor/70 dark:text-white/70 ml-1">
            — guest emails not in the system
          </span>
        </label>
        <div className="space-y-2">
          {invites.map((email, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => {
                  const next = [...invites]
                  next[i] = e.target.value
                  onChange(next)
                }}
                className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg"
              />
              <button
                type="button"
                className="ti-btn ti-btn-light !py-2 !px-2"
                onClick={() => onChange(invites.filter((_, j) => j !== i))}
                aria-label="Remove invite"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
          ))}
          <button
            type="button"
            className="ti-btn ti-btn-outline-light inline-flex w-full items-center justify-center gap-1.5 !py-2 !px-3 !text-sm sm:w-auto sm:justify-start"
            onClick={() => onChange([...invites, ''])}
          >
            <i className="ri-add-line me-0.5"></i>Add email
          </button>
        </div>
      </div>
    </div>
  )
}
