"use client"
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { searchJobFacet } from '@/shared/lib/api/jobs'
import { PortalDropdown } from './PortalDropdown'

type FacetGroup = 'title' | 'company' | 'location'

interface FacetSuggestions {
  titles: string[]
  companies: string[]
  locations: string[]
}

interface FlatOption {
  id: string
  group: FacetGroup
  label: string
}

const EMPTY_SUGGESTIONS: FacetSuggestions = { titles: [], companies: [], locations: [] }
const SUGGESTION_DEBOUNCE_MS = 200
const SUGGESTION_CACHE_LIMIT = 50
const MAX_PER_GROUP = 5

const GROUP_META: Record<FacetGroup, { header: string; icon: string }> = {
  title: { header: 'Job titles', icon: 'ri-briefcase-line' },
  company: { header: 'Companies', icon: 'ri-building-line' },
  location: { header: 'Locations', icon: 'ri-map-pin-line' },
}

function isAbortError(err: unknown): boolean {
  const e = err as { code?: string; name?: string }
  return e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError' || e?.name === 'AbortError'
}

/** Splits `label` around the (case-insensitive) first match of `query` — no dangerouslySetInnerHTML. */
function highlightMatch(label: string, query: string): React.ReactNode {
  const q = query.trim()
  if (!q) return label
  const idx = label.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return label
  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-transparent text-primary font-semibold">{label.slice(idx, idx + q.length)}</mark>
      {label.slice(idx + q.length)}
    </>
  )
}

export interface JobQuickSearchProps {
  value: string
  onChange: (value: string) => void
  status: string
  jobOrigin: '' | 'internal' | 'external'
  /** Optional — shows a subtle spinner in the input while the jobs list request is in flight. */
  loading?: boolean
}

/**
 * Toolbar quick-search: a WAI-ARIA 1.2 combobox over three server facets (title/company/location)
 * with inline "ghost text" completion. Selecting a suggestion only sets the search text — it never
 * adds a filter-panel chip. The live jobs list is driven by `value` in the parent (debounced there);
 * this component owns only the suggestion dropdown and the inline-completion affordance.
 */
export default function JobQuickSearch({ value, onChange, status, jobOrigin, loading }: JobQuickSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const reactId = useId()
  const listboxId = `job-quick-search-listbox-${reactId}`

  const [focused, setFocused] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<FacetSuggestions>(EMPTY_SUGGESTIONS)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState(false)

  /** Set on every keystroke that shrinks the value; cleared on any keystroke that grows/replaces it.
   *  Prevents a just-deleted character from being re-suggested as ghost text on the same keystroke.
   *  State (not a ref) because it feeds the `ghost` computation during render. */
  const [lastEditWasDelete, setLastEditWasDelete] = useState(false)
  const caretToEndRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const cacheRef = useRef<Map<string, FacetSuggestions>>(new Map())

  // --- Suggestions: debounced, cached per (query,status,jobOrigin), abortable, stale-safe. ---
  useEffect(() => {
    const q = value.trim()
    if (!q) {
      setSuggestions(EMPTY_SUGGESTIONS)
      setSuggestionsLoading(false)
      setSuggestionsError(false)
      abortRef.current?.abort()
      return undefined
    }

    const cacheKey = `${status}|${jobOrigin}|${q.toLowerCase()}`
    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      setSuggestions(cached)
      setSuggestionsLoading(false)
      setSuggestionsError(false)
      return undefined
    }

    setSuggestions(EMPTY_SUGGESTIONS)
    setSuggestionsLoading(true)
    setSuggestionsError(false)

    const timer = window.setTimeout(() => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      const requestId = ++requestIdRef.current

      Promise.allSettled([
        searchJobFacet('title', q, { status, jobOrigin }, { signal: ac.signal }),
        searchJobFacet('company', q, { status, jobOrigin }, { signal: ac.signal }),
        searchJobFacet('location', q, { status, jobOrigin }, { signal: ac.signal }),
      ]).then(([titleRes, companyRes, locationRes]) => {
        if (requestId !== requestIdRef.current) return // superseded by a newer query
        if (titleRes.status === 'rejected' && isAbortError(titleRes.reason)) return // aborted, not a real result

        const next: FacetSuggestions = {
          titles: titleRes.status === 'fulfilled' ? titleRes.value.slice(0, MAX_PER_GROUP) : [],
          companies: companyRes.status === 'fulfilled' ? companyRes.value.slice(0, MAX_PER_GROUP) : [],
          locations: locationRes.status === 'fulfilled' ? locationRes.value.slice(0, MAX_PER_GROUP) : [],
        }
        const allFailed =
          titleRes.status === 'rejected' && companyRes.status === 'rejected' && locationRes.status === 'rejected'

        setSuggestions(next)
        setSuggestionsLoading(false)
        setSuggestionsError(allFailed)

        if (!allFailed) {
          cacheRef.current.set(cacheKey, next)
          if (cacheRef.current.size > SUGGESTION_CACHE_LIMIT) {
            const oldestKey = cacheRef.current.keys().next().value
            if (oldestKey !== undefined) cacheRef.current.delete(oldestKey)
          }
        }
      })
    }, SUGGESTION_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [value, status, jobOrigin])

  const flatOptions = useMemo<FlatOption[]>(() => {
    const t = suggestions.titles.map((label, i) => ({ id: `${listboxId}-title-${i}`, group: 'title' as const, label }))
    const c = suggestions.companies.map((label, i) => ({ id: `${listboxId}-company-${i}`, group: 'company' as const, label }))
    const l = suggestions.locations.map((label, i) => ({ id: `${listboxId}-location-${i}`, group: 'location' as const, label }))
    return [...t, ...c, ...l]
  }, [suggestions, listboxId])

  // Inline completion: first suggestion (titles, then companies, then locations) that starts with
  // what was typed. Suppressed while an option is keyboard-highlighted, unfocused, or right after Backspace.
  const ghost = useMemo(() => {
    if (!focused || activeIndex !== -1 || lastEditWasDelete) return ''
    if (!value.trim()) return ''
    const lowerValue = value.toLowerCase()
    const candidates = [suggestions.titles[0], suggestions.companies[0], suggestions.locations[0]]
    for (const candidate of candidates) {
      if (candidate && candidate.toLowerCase().startsWith(lowerValue)) {
        return candidate.slice(value.length)
      }
    }
    return ''
  }, [focused, activeIndex, value, suggestions, lastEditWasDelete])

  useEffect(() => {
    if (caretToEndRef.current && inputRef.current) {
      const len = value.length
      try {
        inputRef.current.setSelectionRange(len, len)
      } catch {
        /* some input configurations don't support selection ranges */
      }
      caretToEndRef.current = false
    }
  }, [value])

  const acceptGhost = useCallback(() => {
    if (!ghost) return false
    setLastEditWasDelete(false)
    caretToEndRef.current = true
    onChange(value + ghost)
    return true
  }, [ghost, value, onChange])

  const selectOption = useCallback(
    (opt: FlatOption) => {
      setLastEditWasDelete(false)
      onChange(opt.label)
      setOpen(false)
      setActiveIndex(-1)
    },
    [onChange]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setLastEditWasDelete(next.length < value.length)
    onChange(next)
    setActiveIndex(-1)
    setOpen(true)
  }

  const handleFocus = () => {
    setFocused(true)
    if (value.trim()) setOpen(true)
  }

  // Options call preventDefault on mousedown, so a real option click never reaches this blur.
  const handleBlur = () => {
    setFocused(false)
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleClear = () => {
    setLastEditWasDelete(false)
    onChange('')
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const atEnd = el.selectionStart === el.selectionEnd && el.selectionStart === value.length

    if ((e.key === 'Tab' || e.key === 'ArrowRight') && ghost && atEnd) {
      e.preventDefault()
      acceptGhost()
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        if (!flatOptions.length) break
        e.preventDefault()
        setOpen(true)
        setActiveIndex((prev) => (prev === -1 ? 0 : (prev + 1) % flatOptions.length))
        break
      case 'ArrowUp':
        if (!flatOptions.length) break
        e.preventDefault()
        setOpen(true)
        setActiveIndex((prev) => (prev === -1 ? flatOptions.length - 1 : (prev - 1 + flatOptions.length) % flatOptions.length))
        break
      case 'Home':
        if (!open || !flatOptions.length) break
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        if (!open || !flatOptions.length) break
        e.preventDefault()
        setActiveIndex(flatOptions.length - 1)
        break
      case 'Enter':
        if (open && activeIndex >= 0 && flatOptions[activeIndex]) {
          e.preventDefault()
          selectOption(flatOptions[activeIndex])
        } else {
          setOpen(false)
          setActiveIndex(-1)
        }
        break
      case 'Escape':
        e.preventDefault()
        if (open) {
          setOpen(false)
          setActiveIndex(-1)
        } else if (value) {
          setLastEditWasDelete(false)
          onChange('')
        }
        break
      default:
        break
    }
  }

  // Global "/" focuses the search, except while already typing somewhere editable.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || Boolean(target?.isContentEditable)
      if (isEditable) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const showClear = value.length > 0
  const showKbdHint = !focused && !showClear
  const adornmentCount = (loading ? 1 : 0) + (showClear || showKbdHint ? 1 : 0)
  const rightPadClass = adornmentCount >= 2 ? '!pe-9' : adornmentCount === 1 ? '!pe-8' : '!pe-3'
  const rightInsetClass = adornmentCount >= 2 ? 'right-9' : adornmentCount === 1 ? 'right-8' : 'right-3'
  const activeOptionId = activeIndex >= 0 ? flatOptions[activeIndex]?.id : undefined
  const showDropdown = open && value.trim().length > 0
  const query = value.trim()

  const renderGroup = (group: FacetGroup, labels: string[], startIndex: number) => {
    if (!labels.length) return null
    const meta = GROUP_META[group]
    return (
      <div key={group} role="group" aria-label={meta.header}>
        <div
          role="presentation"
          className="flex items-center gap-1.5 px-3 pt-1.5 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-defaulttextcolor/50 dark:text-white/40"
        >
          <i className={`${meta.icon} text-[0.75rem]`} aria-hidden />
          {meta.header}
        </div>
        {labels.map((label, i) => {
          const index = startIndex + i
          const opt = flatOptions[index]
          const isActive = index === activeIndex
          return (
            <button
              key={opt.id}
              id={opt.id}
              type="button"
              role="option"
              aria-selected={isActive}
              className={`flex w-full min-h-[36px] items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-primary/10 dark:hover:bg-primary/15 ${
                isActive ? 'bg-primary/10 text-primary' : 'text-gray-800 dark:text-gray-200'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(opt)}
            >
              <span className="min-w-0 flex-1 truncate">{highlightMatch(label, query)}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative flex-1 min-w-[10rem] sm:min-w-[12rem] sm:max-w-xs me-2">
      <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-defaulttextcolor/50 text-[0.875rem] pointer-events-none" aria-hidden />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-autocomplete="both"
        aria-activedescendant={showDropdown ? activeOptionId : undefined}
        aria-label="Search jobs"
        className={`form-control !h-8 !py-1 !ps-8 ${rightPadClass} !text-[0.75rem] !rounded-lg w-full`}
        placeholder="Search jobs by title, company or location…"
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {/* Ghost completion overlay — transparent everywhere except the muted suffix, so the real
          input text underneath (rendered by the browser) is never obscured. */}
      {ghost && (
        <div
          className="pointer-events-none absolute inset-y-0 left-8 flex items-center overflow-hidden whitespace-pre text-[0.75rem]"
          style={{ right: 0 }}
          aria-hidden
        >
          <span className="invisible">{value}</span>
          <span data-testid="job-quick-search-ghost" className="text-defaulttextcolor/40 dark:text-white/30">
            {ghost}
          </span>
        </div>
      )}
      <div className={`absolute ${rightInsetClass} top-1/2 -translate-y-1/2 flex items-center gap-1`}>
        {loading && (
          <span
            className="h-3 w-3 shrink-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin"
            aria-hidden
          />
        )}
        {showClear && (
          <button
            type="button"
            aria-label="Clear search"
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-defaulttextcolor/50 hover:bg-primary/10 hover:text-primary dark:text-white/40 dark:hover:bg-primary/15"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
          >
            <i className="ri-close-line text-[0.75rem]" aria-hidden />
          </button>
        )}
        {showKbdHint && (
          <kbd className="hidden sm:inline-flex items-center justify-center rounded border border-defaultborder/70 bg-light px-1 py-0.5 text-[0.65rem] font-medium leading-none text-defaulttextcolor/50 dark:border-white/10 dark:bg-white/10 dark:text-white/40">
            /
          </kbd>
        )}
      </div>
      <PortalDropdown open={showDropdown} inputRef={inputRef}>
        <div id={listboxId} role="listbox" aria-label="Job search suggestions">
          {suggestionsLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" aria-hidden />
              Searching&hellip;
            </div>
          ) : flatOptions.length > 0 ? (
            <>
              {renderGroup('title', suggestions.titles, 0)}
              {renderGroup('company', suggestions.companies, suggestions.titles.length)}
              {renderGroup('location', suggestions.locations, suggestions.titles.length + suggestions.companies.length)}
            </>
          ) : suggestionsError ? (
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-danger">
              <i className="ri-error-warning-line text-[0.8rem]" aria-hidden />
              Couldn&apos;t load suggestions — the list still updates as you type.
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              No matches for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </PortalDropdown>
    </div>
  )
}
