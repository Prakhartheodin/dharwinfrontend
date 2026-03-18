"use client"
import React from 'react'

interface CandidatesFilterPanelProps {
  filters: { name: string[]; email: string; employeeId: string }
  setFilters: React.Dispatch<React.SetStateAction<any>>
  allNames: string[]
  filterOptionsLoading?: boolean
  filteredNames: string[]
  searchName: string
  setSearchName: (v: string) => void
  handleMultiSelectChange: (field: "name", value: string) => void
  handleRemoveFilter: (field: "name", value: string) => void
  handleResetFilters: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
}

const CandidatesFilterPanel: React.FC<CandidatesFilterPanelProps> = ({
  filters,
  setFilters,
  allNames,
  filterOptionsLoading = false,
  filteredNames,
  searchName,
  setSearchName,
  handleMultiSelectChange,
  handleRemoveFilter,
  handleResetFilters,
}) => {
  return (
      <div id="candidates-filter-panel" className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]" tabIndex={-1}>
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-search-line text-primary text-base"></i>
            Search Candidates
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
            {/* Name Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-user-line text-primary text-base"></i>
                Name
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allNames.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search names..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filterOptionsLoading ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                        Loading names...
                      </div>
                    ) : filteredNames.length > 0 ? (
                      filteredNames.map((name) => (
                        <label
                          key={name}
                          className="flex items-center gap-2 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.name.includes(name)}
                            onChange={() => handleMultiSelectChange('name', name)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{name}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No names found
                      </div>
                    )}
                  </div>
                </div>
                {filters.name.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.name.map((name) => (
                      <span
                        key={name}
                        className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('name', name)}
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

            {/* Email Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-mail-line text-warning text-base"></i>
                Email
              </label>
              <input
                type="text"
                className="form-control border-gray-200 dark:border-defaultborder/10 focus:ring-2 focus:ring-primary/20 !py-1.5 !text-sm"
                placeholder="Search by email..."
                value={filters.email}
                onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            {/* Employee ID Filter */}
            <div className="pb-4">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-id-card-line text-primary text-base"></i>
                Employee ID
              </label>
              <input
                type="text"
                className="form-control border-gray-200 dark:border-defaultborder/10 focus:ring-2 focus:ring-primary/20 !py-1.5 !text-sm"
                placeholder="Search by employee ID..."
                value={filters.employeeId}
                onChange={(e) => setFilters(prev => ({ ...prev, employeeId: e.target.value }))}
              />
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
                data-hs-overlay="#candidates-filter-panel"
              >
                <i className="ri-close-line me-1.5"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>
  )
}

export default CandidatesFilterPanel
