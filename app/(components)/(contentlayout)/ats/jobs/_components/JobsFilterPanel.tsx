"use client"
import React, { startTransition, useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Range, getTrackBackground } from 'react-range'

interface FilterState {
  jobTitle: string[]
  company: string[]
  experience: [number, number]
  location: string[]
  salary: [number, number]
  active: string
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
  handleMultiSelectChange: (key: 'jobTitle' | 'company' | 'location', value: string) => void
  handleRemoveFilter: (key: 'jobTitle' | 'company' | 'location', value: string) => void
  handleSalaryRangeChange: (values: number[]) => void
  handleExperienceRangeChange: (values: number[]) => void
  handleResetFilters: () => void
  salaryRangesConst: { min: number; max: number }
  experienceRangesConst: { min: number; max: number }
}

const COMPACT_INPUT_ICON = 'form-control !h-[34px] !py-[5px] !ps-7 !pe-3 !text-[0.8125rem] !rounded-md w-full'
const COMPACT_SELECT = 'form-select !h-[34px] !py-[5px] !ps-3 !pe-8 !text-[0.8125rem] !rounded-md w-full'
const COMPACT_INPUT = 'form-control !h-[34px] !py-[5px] !px-3 !text-[0.8125rem] !rounded-md w-full'
const SECTION_LABEL = 'block text-[0.7rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5'
const DROPDOWN_MENU = 'max-h-40 overflow-y-auto rounded-lg border border-defaultborder/70 bg-white py-1 shadow-xl dark:border-white/15 dark:bg-bodybg ring-1 ring-black/5'
const DROPDOWN_ITEM = 'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs font-medium transition-colors'
const CHIP = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium max-w-full'

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
    if (!open || !inputRef.current) { setReady(false); return }
    const r = inputRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 2, left: r.left, width: r.width })
    setReady(true)
  }, [open, inputRef])

  useEffect(() => {
    if (!open) return
    const update = () => {
      const r = inputRef.current?.getBoundingClientRect()
      if (r) setPos({ top: r.bottom + 2, left: r.left, width: r.width })
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
    <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }} className={DROPDOWN_MENU}>
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
  handleMultiSelectChange,
  handleRemoveFilter,
  handleSalaryRangeChange,
  handleExperienceRangeChange,
  handleResetFilters,
  salaryRangesConst,
  experienceRangesConst,
}) => {
  const jobTitleInputRef = useRef<HTMLInputElement>(null)
  const companyInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)

  const jobTitleQueryTrimmed = searchJobTitle.trim()
  const showJobTitleSuggestions = jobTitleQueryTrimmed.length > 0
  const jobTitleSuggestionRows = useMemo(() => filteredJobTitles.slice(0, 100), [filteredJobTitles])

  const companyQueryTrimmed = searchCompany.trim()
  const showCompanySuggestions = companyQueryTrimmed.length > 0
  const companySuggestionRows = useMemo(() => filteredCompanies.slice(0, 100), [filteredCompanies])

  const locationQueryTrimmed = searchLocation.trim()
  const showLocationSuggestions = locationQueryTrimmed.length > 0
  const locationSuggestionRows = useMemo(() => filteredLocations.slice(0, 100), [filteredLocations])

  const selectJobTitle = (title: string) => {
    handleMultiSelectChange('jobTitle', title)
    setSearchJobTitle('')
  }
  const selectCompany = (company: string) => {
    handleMultiSelectChange('company', company)
    setSearchCompany('')
  }
  const selectLocation = (location: string) => {
    handleMultiSelectChange('location', location)
    setSearchLocation('')
  }

  return (
    <div
      id="jobs-filter-panel"
      role="region"
      aria-label="Job search and filters"
      aria-hidden={!layoutOpen}
      tabIndex={-1}
      className={
        'w-full shrink-0 origin-top transform-gpu rounded-b-xl bg-white/98 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.35)] transition-[max-height,opacity] duration-300 ease-out dark:bg-bodybg/98 z-[40] motion-reduce:transition-none ' +
        (layoutOpen
          ? 'pointer-events-auto max-h-[min(92vh,52rem)] overflow-hidden border-x border-b border-defaultborder/80 opacity-100'
          : 'pointer-events-none max-h-0 overflow-hidden border-0 opacity-0')
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-defaultborder/60 bg-gradient-to-r from-gray-50/95 to-transparent px-4 py-2 dark:from-black/25 dark:to-transparent">
        <span className="text-[0.8125rem] font-semibold flex items-center gap-1.5 text-gray-800 dark:text-white">
          <i className="ri-filter-3-line text-primary text-sm" aria-hidden />
          Filters
        </span>
        <div className="flex items-center gap-1.5">
          <button type="button" className="ti-btn !py-0.5 !px-2.5 !text-[0.75rem] ti-btn-light" onClick={handleResetFilters}>
            <i className="ri-refresh-line me-1" aria-hidden />Reset
          </button>
          <button type="button" className="ti-btn !py-0.5 !px-2 !text-[0.75rem] ti-btn-light" onClick={onCloseLayout} aria-label="Close filters">
            <i className="ri-close-line" aria-hidden />
          </button>
        </div>
      </div>

      <div className="max-h-[min(82vh,44rem)] overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">

          {/* Listing Type */}
          <div>
            <label className={SECTION_LABEL} htmlFor="jobs-listing-origin">
              <i className="ri-links-line text-primary me-1" aria-hidden />Listing Type
            </label>
            <select
              id="jobs-listing-origin"
              className={COMPACT_SELECT}
              value={listJobOrigin}
              onChange={(e) => {
                const v = (e.target.value || '') as '' | 'internal' | 'external'
                startTransition(() => setListJobOrigin(v))
              }}
            >
              <option value="">All listings</option>
              <option value="internal">Internal only</option>
              <option value="external">External only</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className={SECTION_LABEL}>
              <i className="ri-toggle-line text-secondary me-1" aria-hidden />Status
            </label>
            <select
              className={COMPACT_SELECT}
              value={filters.active}
              onChange={(e) => setFilters((prev) => ({ ...prev, active: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Job Title */}
          <div>
            <label className={SECTION_LABEL}>
              <i className="ri-briefcase-line text-primary me-1" aria-hidden />
              Job Title
              <span className="font-normal ms-1 text-gray-400 dark:text-gray-500">({uniqueJobTitles.length})</span>
            </label>
            <div className="relative">
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[0.7rem] pointer-events-none" aria-hidden />
              <input
                ref={jobTitleInputRef}
                type="text"
                className={COMPACT_INPUT_ICON}
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
                    const selected = filters.jobTitle.includes(title)
                    return (
                      <button key={title} type="button" role="option" aria-selected={selected}
                        className={`${DROPDOWN_ITEM} hover:bg-primary/10 dark:hover:bg-primary/15 ${selected ? 'bg-primary/8 text-primary' : 'text-gray-800 dark:text-gray-200'}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectJobTitle(title)}
                      >
                        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-current opacity-70">
                          {selected ? <i className="ri-check-line text-[0.6rem]" aria-hidden /> : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{title}</span>
                      </button>
                    )
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No matches for &ldquo;{jobTitleQueryTrimmed}&rdquo;</div>
                )}
              </PortalDropdown>
            </div>
            {filters.jobTitle.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {filters.jobTitle.map((title) => (
                  <span key={title} className={`${CHIP} bg-primary/10 border-primary/25 text-primary`}>
                    <span className="truncate">{title}</span>
                    <button type="button" onClick={() => handleRemoveFilter('jobTitle', title)} className="shrink-0 hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                      <i className="ri-close-line text-[0.6rem]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Company */}
          <div>
            <label className={SECTION_LABEL}>
              <i className="ri-building-line text-success me-1" aria-hidden />
              Company
              <span className="font-normal ms-1 text-gray-400 dark:text-gray-500">({uniqueCompanies.length})</span>
            </label>
            <div className="relative">
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[0.7rem] pointer-events-none" aria-hidden />
              <input
                ref={companyInputRef}
                type="text"
                className={COMPACT_INPUT_ICON}
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
                    const selected = filters.company.includes(company)
                    return (
                      <button key={company} type="button" role="option" aria-selected={selected}
                        className={`${DROPDOWN_ITEM} hover:bg-success/10 dark:hover:bg-success/15 ${selected ? 'bg-success/8 text-success' : 'text-gray-800 dark:text-gray-200'}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCompany(company)}
                      >
                        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-current opacity-70">
                          {selected ? <i className="ri-check-line text-[0.6rem]" aria-hidden /> : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{company}</span>
                      </button>
                    )
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No matches for &ldquo;{companyQueryTrimmed}&rdquo;</div>
                )}
              </PortalDropdown>
            </div>
            {filters.company.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {filters.company.map((company) => (
                  <span key={company} className={`${CHIP} bg-success/10 border-success/25 text-success`}>
                    <span className="truncate">{company}</span>
                    <button type="button" onClick={() => handleRemoveFilter('company', company)} className="shrink-0 hover:bg-success/20 rounded-full p-0.5 transition-colors">
                      <i className="ri-close-line text-[0.6rem]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className={SECTION_LABEL}>
              <i className="ri-map-pin-line text-warning me-1" aria-hidden />
              Location
              <span className="font-normal ms-1 text-gray-400 dark:text-gray-500">({uniqueLocations.length})</span>
            </label>
            <div className="relative">
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[0.7rem] pointer-events-none" aria-hidden />
              <input
                ref={locationInputRef}
                type="text"
                className={COMPACT_INPUT_ICON}
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
                    const selected = filters.location.includes(location)
                    return (
                      <button key={location} type="button" role="option" aria-selected={selected}
                        className={`${DROPDOWN_ITEM} hover:bg-warning/10 dark:hover:bg-warning/15 ${selected ? 'bg-warning/8 text-warning' : 'text-gray-800 dark:text-gray-200'}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectLocation(location)}
                      >
                        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-current opacity-70">
                          {selected ? <i className="ri-check-line text-[0.6rem]" aria-hidden /> : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{location}</span>
                      </button>
                    )
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No matches for &ldquo;{locationQueryTrimmed}&rdquo;</div>
                )}
              </PortalDropdown>
            </div>
            {filters.location.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {filters.location.map((location) => (
                  <span key={location} className={`${CHIP} bg-warning/10 border-warning/25 text-warning`}>
                    <span className="truncate">{location}</span>
                    <button type="button" onClick={() => handleRemoveFilter('location', location)} className="shrink-0 hover:bg-warning/20 rounded-full p-0.5 transition-colors">
                      <i className="ri-close-line text-[0.6rem]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Posting Date */}
          <div>
            <label className={SECTION_LABEL}>
              <i className="ri-calendar-line text-info me-1" aria-hidden />Posting Date
            </label>
            <input
              type="date"
              className={COMPACT_INPUT}
              value={filters.postingDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, postingDate: e.target.value }))}
            />
          </div>

          {/* Experience Range — full width, compact */}
          <div className="sm:col-span-2">
            <label className={`${SECTION_LABEL} flex items-center justify-between`}>
              <span><i className="ri-time-line text-info me-1" aria-hidden />Experience (Years)</span>
              <span className="text-[0.7rem] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full normal-case tracking-normal">
                {filters.experience[0]}–{filters.experience[1]} yrs
              </span>
            </label>
            <div className="px-1 py-2 bg-gray-50 dark:bg-black/20 rounded-lg">
              <Range
                values={filters.experience}
                step={1}
                min={experienceRangesConst.min}
                max={experienceRangesConst.max}
                onChange={handleExperienceRangeChange}
                renderTrack={({ props, children }) => (
                  <div onMouseDown={props.onMouseDown} onTouchStart={props.onTouchStart}
                    style={{ ...props.style, height: '20px', display: 'flex', width: '100%', alignItems: 'center', padding: '0 8px' }}>
                    <div ref={props.ref} style={{ height: '4px', width: '100%', borderRadius: '4px', background: getTrackBackground({ values: filters.experience, colors: ['#e2e8f0', '#845adf', '#e2e8f0'], min: experienceRangesConst.min, max: experienceRangesConst.max }) }}>
                      {children}
                    </div>
                  </div>
                )}
                renderThumb={({ index, props, isDragged }) => {
                  const { key, ...rest } = props
                  return (
                    <div key={key} {...rest} style={{ ...rest.style, height: '14px', width: '14px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: isDragged ? '0 0 0 3px rgba(132,90,223,0.25)' : '0px 1px 4px rgba(0,0,0,0.2)', border: '2px solid rgb(132,90,223)', outline: 'none' }}>
                      <div style={{ position: 'absolute', top: '-22px', color: '#fff', fontWeight: '600', fontSize: '10px', fontFamily: 'inherit', padding: '2px 5px', borderRadius: '3px', backgroundColor: 'rgb(132,90,223)', whiteSpace: 'nowrap' }}>
                        {filters.experience[index]}y
                      </div>
                    </div>
                  )
                }}
              />
            </div>
          </div>

          {/* Salary Range — full width, compact */}
          <div className="sm:col-span-2">
            <label className={`${SECTION_LABEL} flex items-center justify-between`}>
              <span><i className="ri-money-dollar-circle-line text-danger me-1" aria-hidden />Salary Range</span>
              <span className="text-[0.7rem] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full normal-case tracking-normal">
                ${filters.salary[0].toLocaleString()}–${filters.salary[1].toLocaleString()}
              </span>
            </label>
            <div className="px-1 py-2 bg-gray-50 dark:bg-black/20 rounded-lg">
              <Range
                values={filters.salary}
                step={1000}
                min={salaryRangesConst.min}
                max={salaryRangesConst.max}
                onChange={handleSalaryRangeChange}
                renderTrack={({ props, children }) => (
                  <div onMouseDown={props.onMouseDown} onTouchStart={props.onTouchStart}
                    style={{ ...props.style, height: '20px', display: 'flex', width: '100%', alignItems: 'center', padding: '0 8px' }}>
                    <div ref={props.ref} style={{ height: '4px', width: '100%', borderRadius: '4px', background: getTrackBackground({ values: filters.salary, colors: ['#e2e8f0', '#845adf', '#e2e8f0'], min: salaryRangesConst.min, max: salaryRangesConst.max }) }}>
                      {children}
                    </div>
                  </div>
                )}
                renderThumb={({ index, props, isDragged }) => {
                  const { key, ...rest } = props
                  return (
                    <div key={key} {...rest} style={{ ...rest.style, height: '14px', width: '14px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: isDragged ? '0 0 0 3px rgba(132,90,223,0.25)' : '0px 1px 4px rgba(0,0,0,0.2)', border: '2px solid rgb(132,90,223)', outline: 'none', cursor: 'grab' }}>
                      <div style={{ position: 'absolute', top: '-22px', color: '#fff', fontWeight: '600', fontSize: '10px', fontFamily: 'inherit', padding: '2px 5px', borderRadius: '3px', backgroundColor: 'rgb(132,90,223)', whiteSpace: 'nowrap' }}>
                        ${filters.salary[index].toLocaleString()}
                      </div>
                    </div>
                  )
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default JobsFilterPanel
