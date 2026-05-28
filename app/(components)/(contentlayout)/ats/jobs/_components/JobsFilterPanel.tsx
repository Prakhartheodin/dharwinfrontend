"use client"
import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

interface FilterState {
  jobTitle: string[]
  company: string[]
  experience: [number, number]
  location: string[]
  salary: [number, number]
  status: string
  postingDate: string
}

interface JobsFilterPanelProps {
  layoutOpen: boolean
  onCloseLayout: () => void
  listJobOrigin: '' | 'internal' | 'external'
  setListJobOrigin: React.Dispatch<React.SetStateAction<'' | 'internal' | 'external'>>
  filters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>
  searchJobTitle: string
  setSearchJobTitle: (v: string) => void
  searchCompany: string
  setSearchCompany: (v: string) => void
  searchLocation: string
  setSearchLocation: (v: string) => void
  filteredJobTitles: string[]
  filteredCompanies: string[]
  filteredLocations: string[]
  uniqueJobTitles: string[]
  uniqueCompanies: string[]
  uniqueLocations: string[]
  uniqueStatuses: string[]
  /** Kept in props for API compatibility — drawer now uses internal draft state. */
  handleMultiSelectChange: (key: 'jobTitle' | 'company' | 'location', value: string) => void
  handleRemoveFilter: (key: 'jobTitle' | 'company' | 'location', value: string) => void
  handleSalaryRangeChange: (values: number[]) => void
  handleExperienceRangeChange: (values: number[]) => void
  handleResetFilters: () => void
  salaryRangesConst: { min: number; max: number }
  experienceRangesConst: { min: number; max: number }
}

const FALLBACK_STATUS_OPTIONS = ['Active', 'Closed', 'Draft', 'Archived']

const INPUT_BASE =
  'form-control !h-9 !py-1.5 !text-[0.8125rem] !rounded-lg !border-defaultborder/70 dark:!border-white/10 w-full'
const INPUT_ICON = `${INPUT_BASE} !ps-8 !pe-3`
const INPUT_PLAIN = `${INPUT_BASE} !px-3`
const SELECT_BASE = `form-select !h-9 !py-1.5 !ps-3 !pe-8 !text-[0.8125rem] !rounded-lg !border-defaultborder/70 dark:!border-white/10 w-full`
const SECTION_TITLE =
  'text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400'
const DROPDOWN_MENU =
  'max-h-44 overflow-y-auto rounded-xl border border-defaultborder/70 bg-white py-1 shadow-2xl dark:border-white/15 dark:bg-bodybg ring-1 ring-black/5'
const DROPDOWN_ITEM =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors'
const CHIP =
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium max-w-full'

// Experience dropdown values (years).
const EXPERIENCE_YEAR_OPTIONS = [0, 1, 2, 3, 5, 7, 10, 15, 20]
const EXPERIENCE_PRESETS: Array<{ label: string; min: number; max: number }> = [
  { label: 'Fresher', min: 0, max: 1 },
  { label: '0–2 yrs', min: 0, max: 2 },
  { label: '2–5 yrs', min: 2, max: 5 },
  { label: '5–10 yrs', min: 5, max: 10 },
  { label: '10+ yrs', min: 10, max: 20 },
]

/** Quick-pick salary range chips (USD). The "open-ended" chip uses the app
 *  default max so the upper bound check is treated as inactive (matches "no
 *  limit" semantics in the filter logic). */
const buildSalaryPresets = (
  defaultMax: number
): Array<{ label: string; min: number; max: number }> => [
  { label: '< $5k', min: 0, max: 5000 },
  { label: '$5k – $10k', min: 5000, max: 10000 },
  { label: '$10k – $25k', min: 10000, max: 25000 },
  { label: '$25k+', min: 25000, max: defaultMax },
]

function formatNumberWithCommas(value: number | string): string {
  if (value === '' || value == null) return ''
  const digits = String(value).replace(/[^\d]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

function parseDigits(value: string): number | null {
  const digits = String(value || '').replace(/[^\d]/g, '')
  if (!digits) return null
  return Number(digits)
}

/** Renders dropdown at document.body level to escape overflow:hidden clipping. */
function PortalDropdown({
  open,
  inputRef,
  children,
}: {
  open: boolean
  inputRef: React.RefObject<HTMLInputElement>
  children: React.ReactNode
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const [ready, setReady] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useLayoutEffect(() => {
    if (!open || !inputRef.current) {
      setReady(false)
      return
    }
    const r = inputRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 2, left: r.left, width: r.width })
    setReady(true)
  }, [open, inputRef])

  useEffect(() => {
    if (!open) return
    const update = () => {
      if (!inputRef.current) return
      const r = inputRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 2, left: r.left, width: r.width })
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, inputRef])

  if (!mounted || !open || !ready) return null

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className={DROPDOWN_MENU}
    >
      {children}
    </div>,
    document.body
  )
}

const JobsFilterPanel: React.FC<JobsFilterPanelProps> = ({
  layoutOpen,
  onCloseLayout,
  listJobOrigin,
  setListJobOrigin,
  filters,
  setFilters,
  searchJobTitle,
  setSearchJobTitle,
  searchCompany,
  setSearchCompany,
  searchLocation,
  setSearchLocation,
  filteredJobTitles,
  filteredCompanies,
  filteredLocations,
  uniqueJobTitles,
  uniqueCompanies,
  uniqueLocations,
  uniqueStatuses,
  salaryRangesConst,
  experienceRangesConst,
}) => {
  const jobTitleInputRef = useRef<HTMLInputElement>(null)
  const companyInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)

  // Draft state — staged until user clicks "Apply Filters". Sync from props
  // each time the drawer opens so any external resets land in the UI.
  const [draft, setDraft] = useState<FilterState>(filters)
  const [draftOrigin, setDraftOrigin] = useState<'' | 'internal' | 'external'>(listJobOrigin)
  const [salaryMinStr, setSalaryMinStr] = useState<string>(
    filters.salary[0] === salaryRangesConst.min ? '' : formatNumberWithCommas(filters.salary[0])
  )
  const [salaryMaxStr, setSalaryMaxStr] = useState<string>(
    filters.salary[1] === salaryRangesConst.max ? '' : formatNumberWithCommas(filters.salary[1])
  )

  useEffect(() => {
    if (!layoutOpen) return
    setDraft(filters)
    setDraftOrigin(listJobOrigin)
    setSalaryMinStr(
      filters.salary[0] === salaryRangesConst.min ? '' : formatNumberWithCommas(filters.salary[0])
    )
    setSalaryMaxStr(
      filters.salary[1] === salaryRangesConst.max ? '' : formatNumberWithCommas(filters.salary[1])
    )
  }, [layoutOpen, filters, listJobOrigin, salaryRangesConst.min, salaryRangesConst.max])

  // Escape + body-scroll lock while drawer open.
  useEffect(() => {
    if (!layoutOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseLayout()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [layoutOpen, onCloseLayout])

  const jobTitleQueryTrimmed = searchJobTitle.trim()
  const showJobTitleSuggestions = jobTitleQueryTrimmed.length > 0
  const jobTitleSuggestionRows = useMemo(() => filteredJobTitles.slice(0, 100), [filteredJobTitles])

  const companyQueryTrimmed = searchCompany.trim()
  const showCompanySuggestions = companyQueryTrimmed.length > 0
  const companySuggestionRows = useMemo(() => filteredCompanies.slice(0, 100), [filteredCompanies])

  const locationQueryTrimmed = searchLocation.trim()
  const showLocationSuggestions = locationQueryTrimmed.length > 0
  const locationSuggestionRows = useMemo(
    () => filteredLocations.slice(0, 100),
    [filteredLocations]
  )

  const toggleDraftArrayValue = (key: 'jobTitle' | 'company' | 'location', value: string) => {
    setDraft((prev) => {
      const arr = prev[key]
      const exists = arr.includes(value)
      const nextArr = exists ? arr.filter((v) => v !== value) : [...arr, value]
      return { ...prev, [key]: nextArr }
    })
  }

  const removeDraftArrayValue = (key: 'jobTitle' | 'company' | 'location', value: string) => {
    setDraft((prev) => ({ ...prev, [key]: prev[key].filter((v) => v !== value) }))
  }

  const selectJobTitle = (title: string) => {
    toggleDraftArrayValue('jobTitle', title)
    setSearchJobTitle('')
  }
  const selectCompany = (company: string) => {
    toggleDraftArrayValue('company', company)
    setSearchCompany('')
  }
  const selectLocation = (location: string) => {
    toggleDraftArrayValue('location', location)
    setSearchLocation('')
  }

  const setDraftExperience = (idx: 0 | 1, value: number) => {
    setDraft((prev) => {
      const next: [number, number] = [...prev.experience] as [number, number]
      next[idx] = value
      // Auto-correct min > max (and vice-versa) so the range stays valid.
      if (idx === 0 && next[0] > next[1]) next[1] = next[0]
      if (idx === 1 && next[1] < next[0]) next[0] = next[1]
      return { ...prev, experience: next }
    })
  }

  const applyExperiencePreset = (min: number, max: number) => {
    setDraft((prev) => ({ ...prev, experience: [min, max] }))
  }

  const handleSalaryMinChange = (value: string) => {
    const formatted = formatNumberWithCommas(value)
    setSalaryMinStr(formatted)
    const num = parseDigits(formatted)
    setDraft((prev) => ({
      ...prev,
      salary: [num ?? salaryRangesConst.min, prev.salary[1]],
    }))
  }
  const handleSalaryMaxChange = (value: string) => {
    const formatted = formatNumberWithCommas(value)
    setSalaryMaxStr(formatted)
    const num = parseDigits(formatted)
    setDraft((prev) => ({
      ...prev,
      salary: [prev.salary[0], num ?? salaryRangesConst.max],
    }))
  }

  const applySalaryPreset = (min: number, max: number) => {
    setSalaryMinStr(min === salaryRangesConst.min ? '' : formatNumberWithCommas(min))
    setSalaryMaxStr(max === salaryRangesConst.max ? '' : formatNumberWithCommas(max))
    setDraft((prev) => ({ ...prev, salary: [min, max] }))
  }

  const draftActiveCount = useMemo(() => {
    let n = 0
    if (draftOrigin) n += 1
    // 'Active' is the page default — not counted as an active custom filter.
    if (draft.status && draft.status !== 'Active') n += 1
    if (draft.jobTitle.length) n += draft.jobTitle.length
    if (draft.company.length) n += draft.company.length
    if (draft.location.length) n += draft.location.length
    if (draft.postingDate) n += 1
    if (
      draft.experience[0] !== experienceRangesConst.min ||
      draft.experience[1] !== experienceRangesConst.max
    )
      n += 1
    if (
      draft.salary[0] !== salaryRangesConst.min ||
      draft.salary[1] !== salaryRangesConst.max
    )
      n += 1
    return n
  }, [draft, draftOrigin, experienceRangesConst, salaryRangesConst])

  const handleClearAll = () => {
    setDraft({
      jobTitle: [],
      company: [],
      experience: [experienceRangesConst.min, experienceRangesConst.max],
      location: [],
      salary: [salaryRangesConst.min, salaryRangesConst.max],
      // Default status filter is Active so Clear All matches the page default.
      status: 'Active',
      postingDate: '',
    })
    setDraftOrigin('')
    setSalaryMinStr('')
    setSalaryMaxStr('')
  }

  const handleApply = () => {
    setFilters(draft)
    setListJobOrigin(draftOrigin)
    onCloseLayout()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden={!layoutOpen}
        onClick={onCloseLayout}
        className={
          'fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ' +
          (layoutOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')
        }
      />
      <aside
        id="jobs-filter-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Job search and filters"
        aria-hidden={!layoutOpen}
        tabIndex={-1}
        className={
          'fixed right-0 top-0 z-[61] h-screen w-full sm:max-w-[28rem] transform-gpu bg-white dark:bg-bodybg flex flex-col shadow-[-12px_0_40px_-12px_rgba(15,23,42,0.25)] border-l border-defaultborder/60 dark:border-white/10 transition-transform duration-300 ease-out motion-reduce:transition-none ' +
          (layoutOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none')
        }
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-defaultborder/60 dark:border-white/10 bg-white/95 dark:bg-bodybg/95 backdrop-blur px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <i className="ri-filter-3-line text-[1rem]" aria-hidden />
            </span>
            <div className="leading-tight">
              <div className="text-[0.95rem] font-semibold text-gray-900 dark:text-white">
                Advanced Search / Apply Filter
              </div>
              <div className="text-[0.7rem] text-gray-500 dark:text-gray-400">
                {draftActiveCount > 0
                  ? `${draftActiveCount} pending change${draftActiveCount === 1 ? '' : 's'}`
                  : 'Company, location, salary, status & more'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            onClick={onCloseLayout}
            aria-label="Close filters"
          >
            <i className="ri-close-line text-base" aria-hidden />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Listing & Status row */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className={`${SECTION_TITLE} mb-1.5 block`} htmlFor="jobs-listing-origin">
                Listing Type
              </label>
              <select
                id="jobs-listing-origin"
                className={SELECT_BASE}
                value={draftOrigin}
                onChange={(e) =>
                  setDraftOrigin((e.target.value || '') as '' | 'internal' | 'external')
                }
              >
                <option value="">All listings</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>
            <div>
              <label className={`${SECTION_TITLE} mb-1.5 block`}>Status</label>
              <select
                className={SELECT_BASE}
                value={draft.status}
                onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="all">All</option>
                {(() => {
                  const merged = Array.from(
                    new Set([...(uniqueStatuses ?? []), ...FALLBACK_STATUS_OPTIONS])
                  )
                    .filter(Boolean)
                    .sort()
                  return merged.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))
                })()}
              </select>
            </div>
          </section>

          {/* Posting Date */}
          <section>
            <label className={`${SECTION_TITLE} mb-1.5 block`}>Posted On</label>
            <input
              type="date"
              className={INPUT_PLAIN}
              value={draft.postingDate}
              onChange={(e) => setDraft((prev) => ({ ...prev, postingDate: e.target.value }))}
            />
          </section>

          {/* Job Title */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <label className={SECTION_TITLE}>Job Title</label>
              <span className="text-[0.7rem] text-gray-400">{uniqueJobTitles.length} available</span>
            </div>
            <div className="relative">
              <i
                className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[0.8rem] pointer-events-none"
                aria-hidden
              />
              <input
                ref={jobTitleInputRef}
                type="text"
                className={INPUT_ICON}
                placeholder="Search job titles…"
                value={searchJobTitle}
                autoComplete="off"
                aria-autocomplete="list"
                onChange={(e) => setSearchJobTitle(e.target.value)}
                onBlur={() => setTimeout(() => setSearchJobTitle(''), 150)}
              />
              <PortalDropdown open={showJobTitleSuggestions} inputRef={jobTitleInputRef}>
                {jobTitleSuggestionRows.length > 0 ? (
                  jobTitleSuggestionRows.map((title) => {
                    const selected = draft.jobTitle.includes(title)
                    return (
                      <button
                        key={title}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`${DROPDOWN_ITEM} hover:bg-primary/10 dark:hover:bg-primary/15 ${
                          selected ? 'bg-primary/10 text-primary' : 'text-gray-800 dark:text-gray-200'
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectJobTitle(title)}
                      >
                        <span
                          className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                            selected
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {selected ? (
                            <i className="ri-check-line text-[0.6rem]" aria-hidden />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{title}</span>
                      </button>
                    )
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                    No matches for &ldquo;{jobTitleQueryTrimmed}&rdquo;
                  </div>
                )}
              </PortalDropdown>
            </div>
            {draft.jobTitle.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {draft.jobTitle.map((title) => (
                  <span
                    key={title}
                    className={`${CHIP} bg-primary/10 border-primary/30 text-primary`}
                  >
                    <span className="truncate">{title}</span>
                    <button
                      type="button"
                      onClick={() => removeDraftArrayValue('jobTitle', title)}
                      className="shrink-0 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${title}`}
                    >
                      <i className="ri-close-line text-[0.6rem]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Company */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <label className={SECTION_TITLE}>Company</label>
              <span className="text-[0.7rem] text-gray-400">{uniqueCompanies.length} available</span>
            </div>
            <div className="relative">
              <i
                className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[0.8rem] pointer-events-none"
                aria-hidden
              />
              <input
                ref={companyInputRef}
                type="text"
                className={INPUT_ICON}
                placeholder="Search companies…"
                value={searchCompany}
                autoComplete="off"
                aria-autocomplete="list"
                onChange={(e) => setSearchCompany(e.target.value)}
                onBlur={() => setTimeout(() => setSearchCompany(''), 150)}
              />
              <PortalDropdown open={showCompanySuggestions} inputRef={companyInputRef}>
                {companySuggestionRows.length > 0 ? (
                  companySuggestionRows.map((company) => {
                    const selected = draft.company.includes(company)
                    return (
                      <button
                        key={company}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`${DROPDOWN_ITEM} hover:bg-success/10 dark:hover:bg-success/15 ${
                          selected ? 'bg-success/10 text-success' : 'text-gray-800 dark:text-gray-200'
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCompany(company)}
                      >
                        <span
                          className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                            selected
                              ? 'border-success bg-success text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {selected ? (
                            <i className="ri-check-line text-[0.6rem]" aria-hidden />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{company}</span>
                      </button>
                    )
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                    No matches for &ldquo;{companyQueryTrimmed}&rdquo;
                  </div>
                )}
              </PortalDropdown>
            </div>
            {draft.company.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {draft.company.map((company) => (
                  <span
                    key={company}
                    className={`${CHIP} bg-success/10 border-success/30 text-success`}
                  >
                    <span className="truncate">{company}</span>
                    <button
                      type="button"
                      onClick={() => removeDraftArrayValue('company', company)}
                      className="shrink-0 hover:bg-success/20 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${company}`}
                    >
                      <i className="ri-close-line text-[0.6rem]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Location */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <label className={SECTION_TITLE}>Location</label>
              <span className="text-[0.7rem] text-gray-400">{uniqueLocations.length} available</span>
            </div>
            <div className="relative">
              <i
                className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[0.8rem] pointer-events-none"
                aria-hidden
              />
              <input
                ref={locationInputRef}
                type="text"
                className={INPUT_ICON}
                placeholder="Search locations…"
                value={searchLocation}
                autoComplete="off"
                aria-autocomplete="list"
                onChange={(e) => setSearchLocation(e.target.value)}
                onBlur={() => setTimeout(() => setSearchLocation(''), 150)}
              />
              <PortalDropdown open={showLocationSuggestions} inputRef={locationInputRef}>
                {locationSuggestionRows.length > 0 ? (
                  locationSuggestionRows.map((location) => {
                    const selected = draft.location.includes(location)
                    return (
                      <button
                        key={location}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`${DROPDOWN_ITEM} hover:bg-warning/10 dark:hover:bg-warning/15 ${
                          selected ? 'bg-warning/10 text-warning' : 'text-gray-800 dark:text-gray-200'
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectLocation(location)}
                      >
                        <span
                          className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                            selected
                              ? 'border-warning bg-warning text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {selected ? (
                            <i className="ri-check-line text-[0.6rem]" aria-hidden />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{location}</span>
                      </button>
                    )
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                    No matches for &ldquo;{locationQueryTrimmed}&rdquo;
                  </div>
                )}
              </PortalDropdown>
            </div>
            {draft.location.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {draft.location.map((location) => (
                  <span
                    key={location}
                    className={`${CHIP} bg-warning/10 border-warning/30 text-warning`}
                  >
                    <span className="truncate">{location}</span>
                    <button
                      type="button"
                      onClick={() => removeDraftArrayValue('location', location)}
                      className="shrink-0 hover:bg-warning/20 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${location}`}
                    >
                      <i className="ri-close-line text-[0.6rem]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Experience — preset chips + min/max dropdowns */}
          <section className="rounded-xl border border-defaultborder/60 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] p-3">
            <div className="flex items-center justify-between mb-2">
              <label className={SECTION_TITLE}>Experience</label>
              <span className="text-[0.7rem] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {draft.experience[0]}–{draft.experience[1]} yrs
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {EXPERIENCE_PRESETS.map((p) => {
                const active = draft.experience[0] === p.min && draft.experience[1] === p.max
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyExperiencePreset(p.min, p.max)}
                    className={
                      'px-2.5 py-1 rounded-full text-[0.7rem] font-medium border transition-colors ' +
                      (active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-bodybg text-gray-700 dark:text-gray-200 border-defaultborder/60 dark:border-white/10 hover:border-primary/50 hover:text-primary')
                    }
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[0.7rem] font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Min Years
                </label>
                <select
                  className={SELECT_BASE}
                  value={draft.experience[0]}
                  onChange={(e) => setDraftExperience(0, Number(e.target.value))}
                >
                  {EXPERIENCE_YEAR_OPTIONS.map((y) => (
                    <option key={`min-${y}`} value={y}>
                      {y === experienceRangesConst.max ? `${y}+` : y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[0.7rem] font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Max Years
                </label>
                <select
                  className={SELECT_BASE}
                  value={draft.experience[1]}
                  onChange={(e) => setDraftExperience(1, Number(e.target.value))}
                >
                  {EXPERIENCE_YEAR_OPTIONS.map((y) => (
                    <option key={`max-${y}`} value={y}>
                      {y === experienceRangesConst.max ? `${y}+` : y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Salary — preset chips + min/max inputs with comma formatting */}
          <section className="rounded-xl border border-defaultborder/60 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] p-3">
            <div className="flex items-center justify-between mb-2">
              <label className={SECTION_TITLE}>Salary Range</label>
              <span className="text-[0.7rem] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {salaryMinStr || 'Any'} – {salaryMaxStr || 'Any'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {buildSalaryPresets(salaryRangesConst.max).map((p) => {
                const active = draft.salary[0] === p.min && draft.salary[1] === p.max
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applySalaryPreset(p.min, p.max)}
                    className={
                      'px-2.5 py-1 rounded-full text-[0.7rem] font-medium border transition-colors ' +
                      (active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-bodybg text-gray-700 dark:text-gray-200 border-defaultborder/60 dark:border-white/10 hover:border-primary/50 hover:text-primary')
                    }
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[0.7rem] font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Min Salary
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[0.8rem] pointer-events-none">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`${INPUT_BASE} !pl-6 !pr-2`}
                    placeholder="Any"
                    value={salaryMinStr}
                    onChange={(e) => handleSalaryMinChange(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-[0.7rem] font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Max Salary
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[0.8rem] pointer-events-none">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`${INPUT_BASE} !pl-6 !pr-2`}
                    placeholder="Any"
                    value={salaryMaxStr}
                    onChange={(e) => handleSalaryMaxChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[0.68rem] text-gray-400 dark:text-gray-500">
              Leave empty for no limit. Numbers auto-format with commas.
            </p>
          </section>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-defaultborder/60 dark:border-white/10 bg-white/95 dark:bg-bodybg/95 backdrop-blur px-5 py-3">
          <button
            type="button"
            onClick={handleClearAll}
            className="ti-btn ti-btn-light !text-[0.8125rem] !py-2 !px-3 !rounded-lg flex-1"
          >
            <i className="ri-refresh-line me-1.5" aria-hidden />Clear All
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="ti-btn ti-btn-primary !text-[0.8125rem] !py-2 !px-3 !rounded-lg flex-[1.4] inline-flex items-center justify-center gap-1.5"
          >
            <i className="ri-check-line" aria-hidden />
            Apply Filters
            {draftActiveCount > 0 && (
              <span className="bg-white/25 text-white text-[0.65rem] font-semibold rounded-full px-1.5 py-0.5">
                {draftActiveCount}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}

export default JobsFilterPanel
