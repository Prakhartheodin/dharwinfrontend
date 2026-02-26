"use client"
import React from 'react'

export interface InterviewsFilterPanelProps {
  filters: {
    candidate: string[]
    recruiter: string[]
    status: string[]
    type: string[]
  }
  searchCandidate: string
  setSearchCandidate: (v: string) => void
  searchRecruiter: string
  setSearchRecruiter: (v: string) => void
  searchStatus: string
  setSearchStatus: (v: string) => void
  searchType: string
  setSearchType: (v: string) => void
  allCandidates: string[]
  allRecruiters: string[]
  allStatuses: string[]
  allTypes: string[]
  filteredCandidates: string[]
  filteredRecruiters: string[]
  filteredStatuses: string[]
  filteredTypes: string[]
  handleMultiSelectChange: (key: 'candidate' | 'recruiter' | 'status' | 'type', value: string) => void
  handleRemoveFilter: (key: 'candidate' | 'recruiter' | 'status' | 'type', value: string) => void
  handleResetFilters: () => void
}

export default function InterviewsFilterPanel({
  filters,
  searchCandidate,
  setSearchCandidate,
  searchRecruiter,
  setSearchRecruiter,
  searchStatus,
  setSearchStatus,
  searchType,
  setSearchType,
  allCandidates,
  allRecruiters,
  allStatuses,
  allTypes,
  filteredCandidates,
  filteredRecruiters,
  filteredStatuses,
  filteredTypes,
  handleMultiSelectChange,
  handleRemoveFilter,
  handleResetFilters,
}: InterviewsFilterPanelProps) {
  return (
    <div id="interviews-filter-panel" className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]" tabIndex={-1}>
      <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
        <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
          <i className="ri-search-line text-primary text-base"></i>
          Search Interviews
        </h6>
        <button 
          type="button" 
          className="ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
          onClick={handleResetFilters}
        >
          
              <i className="ri-refresh-line me-1.5"></i>Reset
         
        </button>
      </div>
      <div className="ti-offcanvas-body !p-4">
        <div className="space-y-5">
          {/* Candidate Filter */}
          <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
            <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
              <i className="ri-user-line text-primary text-base"></i>
              Candidate
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allCandidates.length})</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                className="form-control !py-1.5 !text-sm mb-1.5"
                placeholder="Search candidates..."
                value={searchCandidate}
                onChange={(e) => setSearchCandidate(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                <div className="space-y-1">
                  {filteredCandidates.length > 0 ? (
                    filteredCandidates.map((candidate) => (
                      <label
                        key={candidate}
                        className="flex items-center gap-2 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 p-1.5 rounded-md transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="form-check-input !w-3.5 !h-3.5"
                          checked={filters.candidate.includes(candidate)}
                          onChange={() => handleMultiSelectChange('candidate', candidate)}
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{candidate}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                      No candidates found
                    </div>
                  )}
                </div>
              </div>
              {filters.candidate.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {filters.candidate.map((candidate) => (
                    <span
                      key={candidate}
                      className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                    >
                      {candidate}
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter('candidate', candidate)}
                        className="hover:text-primary-hover hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      >
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recruiter Filter */}
          <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
            <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
              <i className="ri-team-line text-success text-base"></i>
              Recruiter
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allRecruiters.length})</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                className="form-control !py-1.5 !text-sm mb-1.5"
                placeholder="Search recruiters..."
                value={searchRecruiter}
                onChange={(e) => setSearchRecruiter(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                <div className="space-y-1">
                  {filteredRecruiters.length > 0 ? (
                    filteredRecruiters.map((recruiter) => (
                      <label
                        key={recruiter}
                        className="flex items-center gap-2 cursor-pointer hover:bg-success/5 dark:hover:bg-success/10 p-1.5 rounded-md transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="form-check-input !w-3.5 !h-3.5"
                          checked={filters.recruiter.includes(recruiter)}
                          onChange={() => handleMultiSelectChange('recruiter', recruiter)}
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{recruiter}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                      No recruiters found
                    </div>
                  )}
                </div>
              </div>
              {filters.recruiter.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {filters.recruiter.map((recruiter) => (
                    <span
                      key={recruiter}
                      className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                    >
                      {recruiter}
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter('recruiter', recruiter)}
                        className="hover:text-success-hover hover:bg-success/20 rounded-full p-0.5 transition-colors"
                      >
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
            <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
              <i className="ri-checkbox-circle-line text-info text-base"></i>
              Status
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allStatuses.length})</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                className="form-control !py-1.5 !text-sm mb-1.5"
                placeholder="Search status..."
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                <div className="space-y-1">
                  {filteredStatuses.length > 0 ? (
                    filteredStatuses.map((status) => (
                      <label
                        key={status}
                        className="flex items-center gap-2 cursor-pointer hover:bg-info/5 dark:hover:bg-info/10 p-1.5 rounded-md transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="form-check-input !w-3.5 !h-3.5"
                          checked={filters.status.includes(status)}
                          onChange={() => handleMultiSelectChange('status', status)}
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{status}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                      No statuses found
                    </div>
                  )}
                </div>
              </div>
              {filters.status.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {filters.status.map((status) => (
                    <span
                      key={status}
                      className="badge bg-info/10 text-info border border-info/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                    >
                      {status}
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter('status', status)}
                        className="hover:text-info-hover hover:bg-info/20 rounded-full p-0.5 transition-colors"
                      >
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Type Filter */}
          <div className="pb-4">
            <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
              <i className="ri-vidicon-line text-warning text-base"></i>
              Type
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allTypes.length})</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                className="form-control !py-1.5 !text-sm mb-1.5"
                placeholder="Search types..."
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                <div className="space-y-1">
                  {filteredTypes.length > 0 ? (
                    filteredTypes.map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 cursor-pointer hover:bg-warning/5 dark:hover:bg-warning/10 p-1.5 rounded-md transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="form-check-input !w-3.5 !h-3.5"
                          checked={filters.type.includes(type)}
                          onChange={() => handleMultiSelectChange('type', type)}
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{type}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                      No types found
                    </div>
                  )}
                </div>
              </div>
              {filters.type.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {filters.type.map((type) => (
                    <span
                      key={type}
                      className="badge bg-warning/10 text-warning border border-warning/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                    >
                      {type}
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter('type', type)}
                        className="hover:text-warning-hover hover:bg-warning/20 rounded-full p-0.5 transition-colors"
                      >
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filter Actions */}
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
              data-hs-overlay="#interviews-filter-panel"
            >
              <i className="ri-close-line me-1.5"></i>Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
