"use client"
import React, { useEffect, useId, useMemo, useRef, useState } from 'react'

export interface ParticipantUser {
  id: string
  name?: string
  email: string
}

export interface ParticipantInvitesFieldProps {
  invites: string[]
  onChange: (next: string[]) => void
  users: ParticipantUser[]
  usersLoading?: boolean
  usersError?: string | null
  onReloadUsers?: () => void
  idPrefix?: string
}

const norm = (s: string) => s.trim().toLowerCase()

const MAX_USER_RESULTS = 500

export default function ParticipantInvitesField({
  invites,
  onChange,
  users,
  usersLoading,
  usersError,
  onReloadUsers,
  idPrefix = 'participant',
}: ParticipantInvitesFieldProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [userQuery, setUserQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const invitedSet = useMemo(() => new Set(invites.map(norm).filter(Boolean)), [invites])
  const userByEmail = useMemo(() => {
    const m = new Map<string, ParticipantUser>()
    users.forEach((u) => { if (u.email) m.set(norm(u.email), u) })
    return m
  }, [users])

  // List ALL matching users (selected ones stay visible with a ticked checkbox).
  const filteredUsers = useMemo(() => {
    const q = norm(userQuery)
    const pool = users.filter((u) => u.email)
    const matched = q
      ? pool.filter((u) => norm(u.email).includes(q) || norm(u.name || '').includes(q))
      : pool
    return matched.slice(0, MAX_USER_RESULTS)
  }, [users, userQuery])

  // Split the single invites list: directory users → chips, free-typed guests → editable rows.
  const directoryInvites = useMemo(
    () => invites.map((e, i) => ({ e, i })).filter(({ e }) => userByEmail.has(norm(e))),
    [invites, userByEmail]
  )
  const guestInvites = useMemo(
    () => invites.map((e, i) => ({ e, i })).filter(({ e }) => !userByEmail.has(norm(e))),
    [invites, userByEmail]
  )

  const toggleUser = (user: ParticipantUser) => {
    const e = norm(user.email)
    if (invitedSet.has(e)) {
      onChange(invites.filter((x) => norm(x) !== e))
    } else {
      onChange([...invites, user.email])
    }
  }

  const selectAllFiltered = () => {
    const toAdd = filteredUsers
      .filter((u) => !invitedSet.has(norm(u.email)))
      .map((u) => u.email)
    if (toAdd.length) onChange([...invites, ...toAdd])
  }

  const removeAt = (idx: number) => onChange(invites.filter((_, j) => j !== idx))

  useEffect(() => {
    if (!pickerOpen) return
    const onDocPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setPickerOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDocPointer)
    return () => document.removeEventListener('mousedown', onDocPointer)
  }, [pickerOpen])

  useEffect(() => {
    setActiveIndex(filteredUsers.length ? 0 : -1)
  }, [userQuery, filteredUsers.length])

  const onUserSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!pickerOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setPickerOpen(true)
      return
    }
    if (!filteredUsers.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % filteredUsers.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? filteredUsers.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      toggleUser(filteredUsers[activeIndex]) // multi-select: toggle, keep dropdown open
    } else if (e.key === 'Escape') {
      setPickerOpen(false)
      setActiveIndex(-1)
    }
  }

  const userPickerDisabled = usersLoading || !!usersError
  const unselectedInView = filteredUsers.filter((u) => !invitedSet.has(norm(u.email))).length

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={`${idPrefix}-user-search`}
          className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5"
        >
          Add participants from users
          <span className="text-xs font-normal text-defaulttextcolor/70 dark:text-white/70 ml-1">
            — pick several; everyone gets an email invite
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
        <div ref={rootRef} className="relative">
          <div className="relative">
            <i
              className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-defaulttextcolor/50 dark:text-white/50"
              aria-hidden
            />
            <input
              ref={inputRef}
              id={`${idPrefix}-user-search`}
              type="search"
              autoComplete="off"
              role="combobox"
              aria-expanded={pickerOpen}
              aria-controls={listId}
              aria-autocomplete="list"
              disabled={userPickerDisabled}
              placeholder={usersLoading ? 'Loading users...' : 'Search by name or email...'}
              value={userQuery}
              onChange={(e) => {
                setUserQuery(e.target.value)
                setPickerOpen(true)
              }}
              onFocus={() => {
                if (!userPickerDisabled) setPickerOpen(true)
              }}
              onKeyDown={onUserSearchKeyDown}
              className="form-control !py-2 !pl-9 !pr-3 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {pickerOpen && !userPickerDisabled ? (
            <div
              className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-defaultborder bg-white shadow-lg dark:border-defaultborder/10 dark:bg-bodybg"
            >
              {unselectedInView > 1 ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-b border-defaultborder px-3 py-2 text-left text-xs font-medium text-primary hover:bg-primary/5 dark:border-defaultborder/10"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={selectAllFiltered}
                >
                  <i className="ri-checkbox-multiple-line text-sm" />
                  Select all {userQuery.trim() ? 'matching' : ''} ({unselectedInView})
                </button>
              ) : null}
              <ul id={listId} role="listbox" aria-multiselectable className="max-h-52 overflow-y-auto">
                {filteredUsers.length ? (
                  filteredUsers.map((u, i) => {
                    const checked = invitedSet.has(norm(u.email))
                    const active = i === activeIndex
                    return (
                      <li key={u.id} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={checked}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                            active
                              ? 'bg-primary/10'
                              : 'hover:bg-light dark:hover:bg-white/5'
                          }`}
                          onMouseEnter={() => setActiveIndex(i)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => toggleUser(u)}
                        >
                          <span
                            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                              checked
                                ? 'border-primary bg-primary text-white'
                                : 'border-defaultborder dark:border-white/20'
                            }`}
                            aria-hidden
                          >
                            {checked ? <i className="ri-check-line text-[11px] leading-none" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-defaulttextcolor dark:text-white">
                              {u.name || u.email}
                            </span>
                            {u.name ? (
                              <span className="block truncate text-xs text-defaulttextcolor/60 dark:text-white/60">
                                {u.email}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    )
                  })
                ) : (
                  <li className="px-3 py-2 text-sm text-defaulttextcolor/60 dark:text-white/60" role="status">
                    {usersLoading ? 'Loading users...' : userQuery.trim() ? 'No users match your search' : 'No users to show'}
                  </li>
                )}
                {!userQuery.trim() && users.length > MAX_USER_RESULTS ? (
                  <li className="border-t border-defaultborder px-3 py-2 text-xs text-defaulttextcolor/60 dark:border-defaultborder/10 dark:text-white/60">
                    Showing first {MAX_USER_RESULTS} users — type to narrow results
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Selected participants as removable chips */}
        {directoryInvites.length ? (
          <div className="mt-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-defaulttextcolor/70 dark:text-white/70">
                {directoryInvites.length} selected
              </span>
              <button
                type="button"
                className="text-xs text-danger hover:underline"
                onClick={() => onChange(invites.filter((e) => !userByEmail.has(norm(e))))}
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {directoryInvites.map(({ e, i }) => {
                const u = userByEmail.get(norm(e))
                return (
                  <span
                    key={i}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs text-primary"
                  >
                    <span className="truncate" title={u?.name ? `${u.name} — ${e}` : e}>
                      {u?.name || e}
                    </span>
                    <button
                      type="button"
                      className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full hover:bg-primary/20"
                      onClick={() => removeAt(i)}
                      aria-label={`Remove ${u?.name || e}`}
                    >
                      <i className="ri-close-line text-[13px]" />
                    </button>
                  </span>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
          Email invites
          <span className="text-xs font-normal text-defaulttextcolor/70 dark:text-white/70 ml-1">
            — guest emails not in the system
          </span>
        </label>
        <div className="space-y-2">
          {guestInvites.map(({ e: email, i }) => (
            <div key={i} className="flex gap-2">
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(ev) => {
                  const next = [...invites]
                  next[i] = ev.target.value
                  onChange(next)
                }}
                className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg"
              />
              <button
                type="button"
                className="ti-btn ti-btn-light !py-2 !px-2"
                onClick={() => removeAt(i)}
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
