"use client"
import React from 'react'
import type { AgentOption } from '@/shared/lib/api/candidates'

interface CandidatesFilterPanelProps {
  filters: {
    name: string[]
    email: string
    employeeId: string
    agentIds: string[]
    employmentStatus: 'current' | 'resigned' | 'all'
  }
  setFilters: React.Dispatch<React.SetStateAction<any>>
  allNames: string[]
  filterOptionsLoading?: boolean
  filteredNames: string[]
  searchName: string
  setSearchName: (v: string) => void
  agentOptions: AgentOption[]
  agentsLoading?: boolean
  filteredAgents: AgentOption[]
  searchAgent: string
  setSearchAgent: (v: string) => void
  handleMultiSelectChange: (field: 'name' | 'agentIds', value: string) => void
  handleRemoveFilter: (field: 'name' | 'agentIds', value: string) => void
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
  agentOptions,
  agentsLoading = false,
  filteredAgents,
  searchAgent,
  setSearchAgent,
  handleMultiSelectChange,
  handleRemoveFilter,
  handleResetFilters,
}) => {
  const agentLabel = (id: string) => agentOptions.find((a) => a.id === id)?.name ?? id

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
            {/* Employment Status: Current / Resigned / All */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-user-search-line text-primary text-base"></i>
                Employment Status
              </label>
              <select
                className="form-control !py-1.5 !text-sm"
                value={filters.employmentStatus}
                onChange={(e) => setFilters((prev) => ({ ...prev, employmentStatus: e.target.value as 'current' | 'resigned' | 'all' }))}
              >
                <option value="current">Current</option>
                <option value="resigned">Resigned</option>
                <option value="all">All</option>
              </select>
            </div>

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
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
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

            {/* Assigned agent — same pattern as Name: list of all agents */}
            <div className="pb-4">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-user-settings-line text-primary text-base"></i>
                Agent
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({agentOptions.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search agents..."
                  value={searchAgent}
                  onChange={(e) => setSearchAgent(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {agentsLoading ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                        Loading agents...
                      </div>
                    ) : filteredAgents.length > 0 ? (
                      filteredAgents.map((a) => (
                        <label
                          key={a.id}
                          className="flex items-start gap-2 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5 mt-0.5"
                            checked={filters.agentIds.includes(a.id)}
                            onChange={() => handleMultiSelectChange('agentIds', a.id)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-snug">
                            {a.name}
                            <span className="block text-[0.65rem] font-normal text-gray-500 dark:text-gray-400 truncate" title={a.email}>
                              {a.email}
                            </span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No agents found
                      </div>
                    )}
                  </div>
                </div>
                {filters.agentIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.agentIds.map((id) => (
                      <span
                        key={id}
                        className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm max-w-full"
                      >
                        <span className="truncate">{agentLabel(id)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('agentIds', id)}
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
