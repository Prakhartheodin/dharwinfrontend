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

const MAX_USER_RESULTS = 40

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
  const available = useMemo(
    () => users.filter((u) => u.email && !invitedSet.has(norm(u.email))),
    [users, invitedSet]
  )

  const filteredUsers = useMemo(() => {
    const q = norm(userQuery)
    const pool = q
      ? available.filter((u) => {
          const email = norm(u.email)
          const name = norm(u.name || '')
          return email.includes(q) || name.includes(q)
        })
      : available
    return pool.slice(0, MAX_USER_RESULTS)
  }, [available, userQuery])

  const addEmail = (email: string) => {
    const e = email.trim()
    if (!e || invitedSet.has(norm(e))) return
    onChange([...invites, e])
    setUserQuery('')
    setPickerOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const pickUser = (user: ParticipantUser) => {
    addEmail(user.email)
  }

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
      pickUser(filteredUsers[activeIndex])
    } else if (e.key === 'Escape') {
      setPickerOpen(false)
      setActiveIndex(-1)
    }
  }

  const userPickerDisabled = usersLoading || !!usersError
  const emptyHint = usersLoading
    ? 'Loading users...'
    : available.length
      ? userQuery.trim()
        ? 'No users match your search'
        : 'No users to show'
      : 'No more users to add'

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={`${idPrefix}-user-search`}
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
              placeholder={
                usersLoading
                  ? 'Loading users...'
                  : available.length
                    ? 'Search by name or email...'
                    : 'No more users to add'
              }
              value={userQuery}
              onChange={(e) => {
                setUserQuery(e.target.value)
                setPickerOpen(true)
              }}
              onFocus={() => {
                if (!userPickerDisabled && available.length) setPickerOpen(true)
              }}
              onKeyDown={onUserSearchKeyDown}
              className="form-control !py-2 !pl-9 !pr-3 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {pickerOpen && !userPickerDisabled ? (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-defaultborder bg-white shadow-lg dark:border-defaultborder/10 dark:bg-bodybg"
            >
              {filteredUsers.length ? (
                filteredUsers.map((u, i) => {
                  const label = u.name ? `${u.name} — ${u.email}` : u.email
                  const active = i === activeIndex
                  return (
                    <li key={u.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`block w-full px-3 py-2 text-left text-sm ${
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-defaulttextcolor hover:bg-light dark:text-white dark:hover:bg-white/5'
                        }`}
                        onMouseEnter={() => setActiveIndex(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickUser(u)}
                      >
                        {label}
                      </button>
                    </li>
                  )
                })
              ) : (
                <li className="px-3 py-2 text-sm text-defaulttextcolor/60 dark:text-white/60" role="status">
                  {emptyHint}
                </li>
              )}
              {!userQuery.trim() && available.length > MAX_USER_RESULTS ? (
                <li className="border-t border-defaultborder px-3 py-2 text-xs text-defaulttextcolor/60 dark:border-defaultborder/10 dark:text-white/60">
                  Showing first {MAX_USER_RESULTS} users — type to narrow results
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
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
