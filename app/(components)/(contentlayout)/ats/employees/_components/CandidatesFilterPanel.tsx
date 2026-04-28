"use client"
import React, { useMemo } from 'react'
import type { AgentOption } from '@/shared/lib/api/candidates'

interface CandidatesFilterPanelProps {
  /** Controlled by parent — avoids Preline HSOverlay init missing after client navigations / DOM moves */
  layoutOpen: boolean
  onCloseLayout: () => void
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
  layoutOpen,
  onCloseLayout,
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

  const nameQueryTrimmed = searchName.trim()
  const showNameSuggestions = nameQueryTrimmed.length > 0
  /** Cap suggestions height; full list stays server-side filtered in parent when typing */
  const nameSuggestionRows = useMemo(() => filteredNames.slice(0, 100), [filteredNames])

  const agentQueryTrimmed = searchAgent.trim()
  const showAgentSuggestions = agentQueryTrimmed.length > 0
  const agentSuggestionRows = useMemo(() => filteredAgents.slice(0, 100), [filteredAgents])

  /** Full-width panel under the Employees toolbar — expands downward (Preline overlay not used for open state). */
  return (
      <div
        id="candidates-filter-panel"
        role="region"
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

            {/* Name Filter — suggestions only appear while typing (no full scrollable roster) */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-user-line text-primary text-base"></i>
                Name
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allNames.length})</span>
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    className="form-control !py-1.5 !text-sm"
                    placeholder="Start typing to search names…"
                    value={searchName}
                    autoComplete="off"
                    aria-autocomplete="list"
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                  {showNameSuggestions && (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-defaultborder/70 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-bodybg ring-1 ring-black/5"
                    >
                      {filterOptionsLoading ? (
                        <div className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">Loading names…</div>
                      ) : nameSuggestionRows.length > 0 ? (
                        nameSuggestionRows.map((name) => {
                          const selected = filters.name.includes(name)
                          return (
                            <button
                              key={name}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-primary/10 dark:hover:bg-primary/15 ${
                                selected ? 'bg-primary/8 text-primary' : 'text-gray-800 dark:text-gray-200'
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault()
                              }}
                              onClick={() => handleMultiSelectChange('name', name)}
                            >
                              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-current opacity-70">
                                {selected ? <i className="ri-check-line text-[0.65rem]" aria-hidden /> : null}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{name}</span>
                            </button>
                          )
                        })
                      ) : (
                        <div className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                          No names match “{searchName.trim()}”.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="mb-0 text-[0.65rem] text-gray-500 dark:text-gray-500">
                  Type above to see suggestions; selected names appear as chips below.
                </p>
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

            {/* Agent — suggestions only while typing (same pattern as Name) */}
            <div className="pb-4">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-user-settings-line text-primary text-base"></i>
                Agent
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({agentOptions.length})</span>
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    className="form-control !py-1.5 !text-sm"
                    placeholder="Start typing to search agents…"
                    value={searchAgent}
                    autoComplete="off"
                    aria-autocomplete="list"
                    onChange={(e) => setSearchAgent(e.target.value)}
                  />
                  {showAgentSuggestions && (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-defaultborder/70 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-bodybg ring-1 ring-black/5"
                    >
                      {agentsLoading ? (
                        <div className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">Loading agents…</div>
                      ) : agentSuggestionRows.length > 0 ? (
                        agentSuggestionRows.map((a) => {
                          const selected = filters.agentIds.includes(a.id)
                          return (
                            <button
                              key={a.id}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-primary/10 dark:hover:bg-primary/15 ${
                                selected ? 'bg-primary/8 text-primary' : 'text-gray-800 dark:text-gray-200'
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault()
                              }}
                              onClick={() => handleMultiSelectChange('agentIds', a.id)}
                            >
                              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-current opacity-70">
                                {selected ? <i className="ri-check-line text-[0.65rem]" aria-hidden /> : null}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-medium leading-tight">{a.name}</span>
                                <span
                                  className="block truncate text-[0.65rem] font-normal text-gray-500 dark:text-gray-400"
                                  title={a.email}
                                >
                                  {a.email}
                                </span>
                              </span>
                            </button>
                          )
                        })
                      ) : (
                        <div className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                          No agents match “{searchAgent.trim()}”.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="mb-0 text-[0.65rem] text-gray-500 dark:text-gray-500">
                  Type above to see suggestions; selected agents appear as chips below.
                </p>
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

export default CandidatesFilterPanel
