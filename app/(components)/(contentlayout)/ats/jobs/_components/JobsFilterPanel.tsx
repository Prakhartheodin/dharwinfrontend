"use client"
import React, { startTransition, useMemo } from 'react'
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
  /** Controlled — expands downward under the toolbar (no HSOverlay side panel). */
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
  const jobTitleQueryTrimmed = searchJobTitle.trim()
  const showJobTitleSuggestions = jobTitleQueryTrimmed.length > 0
  const jobTitleSuggestionRows = useMemo(() => filteredJobTitles.slice(0, 100), [filteredJobTitles])

  const companyQueryTrimmed = searchCompany.trim()
  const showCompanySuggestions = companyQueryTrimmed.length > 0
  const companySuggestionRows = useMemo(() => filteredCompanies.slice(0, 100), [filteredCompanies])

  const locationQueryTrimmed = searchLocation.trim()
  const showLocationSuggestions = locationQueryTrimmed.length > 0
  const locationSuggestionRows = useMemo(() => filteredLocations.slice(0, 100), [filteredLocations])

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
      <div className="flex items-center justify-between gap-3 border-b border-defaultborder/60 bg-gradient-to-r from-gray-50/95 to-transparent px-4 py-2.5 dark:from-black/25 dark:to-transparent">
        <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2 !mb-0">
          <i className="ri-search-line text-primary text-base"></i>
          Search &amp; filters
        </h6>
        <button
          type="button"
          className="ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1"
          onClick={handleResetFilters}
        >
          <i className="ri-refresh-line me-1.5"></i>Reset
        </button>
      </div>
      <div className="max-h-[min(82vh,48rem)] overflow-y-auto px-4 py-4">
        <div className="space-y-5">
          <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
            <label
              className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2"
              htmlFor="jobs-listing-origin"
            >
              <i className="ri-links-line text-primary text-base" aria-hidden />
              Listing type
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Filters which jobs are loaded from the server (internal ATS postings vs external mirrors).
            </p>
            <select
              id="jobs-listing-origin"
              className="form-select !text-sm"
              value={listJobOrigin}
              onChange={(e) => {
                const v = (e.target.value || '') as '' | 'internal' | 'external'
                startTransition(() => setListJobOrigin(v))
              }}
              aria-label="Filter jobs by listing type"
            >
              <option value="">All listings</option>
              <option value="internal">Internal jobs only</option>
              <option value="external">External jobs only</option>
            </select>
          </div>
          {/* Job Title — suggestions only while typing (same pattern as Employees → Name) */}
          <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
            <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
              <i className="ri-briefcase-line text-primary text-base"></i>
              Job Title
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                ({uniqueJobTitles.length})
              </span>
            </label>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm"
                  placeholder="Start typing to search job titles…"
                  value={searchJobTitle}
                  autoComplete="off"
                  aria-autocomplete="list"
                  onChange={(e) => setSearchJobTitle(e.target.value)}
                />
                {showJobTitleSuggestions && (
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-defaultborder/70 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-bodybg ring-1 ring-black/5"
                  >
                    {jobTitleSuggestionRows.length > 0 ? (
                      jobTitleSuggestionRows.map((title) => {
                        const selected = filters.jobTitle.includes(title)
                        return (
                          <button
                            key={title}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-primary/10 dark:hover:bg-primary/15 ${
                              selected ? 'bg-primary/8 text-primary' : 'text-gray-800 dark:text-gray-200'
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                            }}
                            onClick={() => handleMultiSelectChange('jobTitle', title)}
                          >
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-current opacity-70">
                              {selected ? <i className="ri-check-line text-[0.65rem]" aria-hidden /> : null}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{title}</span>
                          </button>
                        )
                      })
                    ) : (
                      <div className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                        No job titles match &ldquo;{jobTitleQueryTrimmed}&rdquo;.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mb-0 text-[0.65rem] text-gray-500 dark:text-gray-500">
                Type above to see suggestions; selected job titles appear as chips below.
              </p>
              {filters.jobTitle.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {filters.jobTitle.map((title) => (
                    <span
                      key={title}
                      className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm max-w-full"
                    >
                      <span className="truncate">{title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter('jobTitle', title)}
                        className="hover:text-primary-hover hover:bg-primary/20 rounded-full p-0.5 transition-colors shrink-0"
                      >
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Company — same interaction pattern as Job Title / Employees Name */}
          <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
            <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
              <i className="ri-building-line text-success text-base"></i>
              Company
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({uniqueCompanies.length})</span>
            </label>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm"
                  placeholder="Start typing to search companies…"
                  value={searchCompany}
                  autoComplete="off"
                  aria-autocomplete="list"
                  onChange={(e) => setSearchCompany(e.target.value)}
                />
                {showCompanySuggestions && (
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-defaultborder/70 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-bodybg ring-1 ring-black/5"
                  >
                    {companySuggestionRows.length > 0 ? (
                      companySuggestionRows.map((company) => {
                        const selected = filters.company.includes(company)
                        return (
                          <button
                            key={company}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-success/10 dark:hover:bg-success/15 ${
                              selected ? 'bg-success/8 text-success' : 'text-gray-800 dark:text-gray-200'
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                            }}
                            onClick={() => handleMultiSelectChange('company', company)}
                          >
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-current opacity-70">
                              {selected ? <i className="ri-check-line text-[0.65rem]" aria-hidden /> : null}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{company}</span>
                          </button>
                        )
                      })
                    ) : (
                      <div className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                        No companies match &ldquo;{companyQueryTrimmed}&rdquo;.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mb-0 text-[0.65rem] text-gray-500 dark:text-gray-500">
                Type above to see suggestions; selected companies appear as chips below.
              </p>
              {filters.company.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {filters.company.map((company) => (
                    <span
                      key={company}
                      className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm max-w-full"
                    >
                      <span className="truncate">{company}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter('company', company)}
                        className="hover:text-success-hover hover:bg-success/20 rounded-full p-0.5 transition-colors shrink-0"
                      >
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Experience Filter - Range Slider */}
          <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
            <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <i className="ri-time-line text-info text-base"></i>
                Experience (Years)
              </span>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                {filters.experience[0]} - {filters.experience[1]} years
              </span>
            </label>
            <div className="px-2 py-4 bg-gray-50 dark:bg-black/20 rounded-lg">
              <Range
                values={filters.experience}
                step={1}
                min={experienceRangesConst.min}
                max={experienceRangesConst.max}
                onChange={handleExperienceRangeChange}
                renderTrack={({ props, children }) => (
                  <div
                    onMouseDown={props.onMouseDown}
                    onTouchStart={props.onTouchStart}
                    style={{
                      ...props.style,
                      height: '36px',
                      display: 'flex',
                      width: '100%',
                    }}
                  >
                    <div
                      ref={props.ref}
                      style={{
                        height: '8px',
                        width: '100%',
                        borderRadius: '6px',
                        background: getTrackBackground({
                          values: filters.experience,
                          colors: ['#e2e8f0', '#845adf', '#e2e8f0'],
                          min: experienceRangesConst.min,
                          max: experienceRangesConst.max,
                        }),
                        alignSelf: 'center',
                      }}
                    >
                      {children}
                    </div>
                  </div>
                )}
                renderThumb={({ index, props, isDragged }) => {
                  const { key, ...restProps } = props
                  return (
                    <div
                      key={key}
                      {...restProps}
                      style={{
                        ...restProps.style,
                        height: '20px',
                        width: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: isDragged ? '0px 2px 8px rgba(132, 90, 223, 0.4)' : '0px 2px 6px #AAA',
                        border: '2px solid rgb(132, 90, 223)',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-28px',
                          color: '#fff',
                          fontWeight: '600',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgb(132, 90, 223)',
                        }}
                      >
                        {filters.experience[index]} {filters.experience[index] === 1 ? 'year' : 'years'}
                      </div>
                    </div>
                  )
                }}
              />
            </div>
          </div>

          {/* Location — suggestions only while typing (same pattern as Job Title / Employees Name) */}
          <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
            <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
              <i className="ri-map-pin-line text-warning text-base"></i>
              Location
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({uniqueLocations.length})</span>
            </label>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm"
                  placeholder="Start typing to search locations…"
                  value={searchLocation}
                  autoComplete="off"
                  aria-autocomplete="list"
                  onChange={(e) => setSearchLocation(e.target.value)}
                />
                {showLocationSuggestions && (
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-defaultborder/70 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-bodybg ring-1 ring-black/5"
                  >
                    {locationSuggestionRows.length > 0 ? (
                      locationSuggestionRows.map((location) => {
                        const selected = filters.location.includes(location)
                        return (
                          <button
                            key={location}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-warning/10 dark:hover:bg-warning/15 ${
                              selected ? 'bg-warning/8 text-warning' : 'text-gray-800 dark:text-gray-200'
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                            }}
                            onClick={() => handleMultiSelectChange('location', location)}
                          >
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-current opacity-70">
                              {selected ? <i className="ri-check-line text-[0.65rem]" aria-hidden /> : null}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{location}</span>
                          </button>
                        )
                      })
                    ) : (
                      <div className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                        No locations match &ldquo;{locationQueryTrimmed}&rdquo;.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mb-0 text-[0.65rem] text-gray-500 dark:text-gray-500">
                Type above to see suggestions; selected locations appear as chips below.
              </p>
              {filters.location.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {filters.location.map((location) => (
                    <span
                      key={location}
                      className="badge bg-warning/10 text-warning border border-warning/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm max-w-full"
                    >
                      <span className="truncate">{location}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter('location', location)}
                        className="hover:text-warning-hover hover:bg-warning/20 rounded-full p-0.5 transition-colors shrink-0"
                      >
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Salary Filter - Range Slider */}
          <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
            <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <i className="ri-money-dollar-circle-line text-danger text-base"></i>
                Salary Range
              </span>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                ${filters.salary[0].toLocaleString()} - ${filters.salary[1].toLocaleString()}
              </span>
            </label>
            <div className="px-2 py-4 bg-gray-50 dark:bg-black/20 rounded-lg">
              <Range
                values={filters.salary}
                step={1000}
                min={salaryRangesConst.min}
                max={salaryRangesConst.max}
                onChange={handleSalaryRangeChange}
                renderTrack={({ props, children }) => (
                  <div
                    onMouseDown={props.onMouseDown}
                    onTouchStart={props.onTouchStart}
                    style={{
                      ...props.style,
                      height: '36px',
                      display: 'flex',
                      width: '100%',
                    }}
                  >
                    <div
                      ref={props.ref}
                      style={{
                        height: '8px',
                        width: '100%',
                        borderRadius: '6px',
                        background: getTrackBackground({
                          values: filters.salary,
                          colors: ['#e2e8f0', '#845adf', '#e2e8f0'],
                          min: salaryRangesConst.min,
                          max: salaryRangesConst.max,
                        }),
                        alignSelf: 'center',
                      }}
                    >
                      {children}
                    </div>
                  </div>
                )}
                renderThumb={({ index, props, isDragged }) => {
                  const { key, ...restProps } = props
                  return (
                    <div
                      key={key}
                      {...restProps}
                      style={{
                        ...restProps.style,
                        height: '24px',
                        width: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: isDragged
                          ? '0px 4px 12px rgba(132, 90, 223, 0.5)'
                          : '0px 2px 8px rgba(0, 0, 0, 0.15)',
                        border: '3px solid rgb(132, 90, 223)',
                        cursor: 'grab',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-36px',
                          color: '#fff',
                          fontWeight: '600',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgb(132, 90, 223)',
                          boxShadow: '0px 2px 8px rgba(132, 90, 223, 0.3)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ${filters.salary[index].toLocaleString()}
                      </div>
                    </div>
                  )
                }}
              />
            </div>
          </div>

          {/* Active Status Filter */}
          <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
            <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
              <i className="ri-toggle-line text-secondary text-base"></i>
              Status
            </label>
            <select
              className="form-select border-gray-200 dark:border-defaultborder/10 focus:ring-2 focus:ring-primary/20 !py-1.5 !text-sm"
              value={filters.active}
              onChange={(e) => setFilters((prev) => ({ ...prev, active: e.target.value }))}
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Posting Date Filter */}
          <div className="pb-4">
            <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
              <i className="ri-calendar-line text-info text-base"></i>
              Posting Date
            </label>
            <input
              type="date"
              className="form-control border-gray-200 dark:border-defaultborder/10 focus:ring-2 focus:ring-primary/20 !py-1.5 !text-sm"
              value={filters.postingDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, postingDate: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-defaultborder/10">
            <button
              type="button"
              className="ti-btn ti-btn-primary flex-1 font-medium shadow-sm hover:shadow-md transition-shadow !py-1.5 !text-sm"
              onClick={handleResetFilters}
            >
              <i className="ri-refresh-line me-1.5"></i>Reset
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-light font-medium shadow-sm hover:shadow-md transition-shadow !py-1.5 !text-sm"
              onClick={onCloseLayout}
            >
              <i className="ri-close-line me-1.5"></i>Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobsFilterPanel
