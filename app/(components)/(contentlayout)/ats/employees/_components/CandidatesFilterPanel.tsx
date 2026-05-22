"use client"
import React, { useMemo, useRef, useLayoutEffect, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AgentOption } from '@/shared/lib/api/candidates'

interface CandidatesFilterPanelProps {
  layoutOpen: boolean
  onCloseLayout: () => void
  filters: {
    name: string[]
    email: string
    employeeId: string
    agentIds: string[]
    employmentStatus: 'current' | 'resigned' | 'all'
    compensationType: '' | 'paid' | 'unpaid'
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

const COMPACT_INPUT = 'form-control !h-[34px] !py-[5px] !px-3 !text-[0.8125rem] !rounded-md w-full'
const COMPACT_INPUT_ICON = 'form-control !h-[34px] !py-[5px] !ps-7 !pe-3 !text-[0.8125rem] !rounded-md w-full'
const COMPACT_SELECT = 'form-select !h-[34px] !py-[5px] !ps-3 !pe-8 !text-[0.8125rem] !rounded-md w-full'
const SECTION_LABEL = 'block text-[0.7rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5'
const DROPDOWN_MENU = 'max-h-40 overflow-y-auto rounded-lg border border-defaultborder/70 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-bodybg ring-1 ring-black/5'
const DROPDOWN_ITEM_BASE = 'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs font-medium transition-colors'
const CHIP_BASE = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium max-w-full'

interface PortalDropdownProps {
  open: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  children: React.ReactNode
}

function PortalDropdown({ open, inputRef, children }: PortalDropdownProps) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const [ready, setReady] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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
    <div
      role="listbox"
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className={DROPDOWN_MENU}
    >
      {children}
    </div>,
    document.body
  )
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
  const nameInputRef = useRef<HTMLInputElement>(null)
  const agentInputRef = useRef<HTMLInputElement>(null)

  const agentLabel = (id: string) => agentOptions.find((a) => a.id === id)?.name ?? id

  const nameQueryTrimmed = searchName.trim()
  const showNameSuggestions = nameQueryTrimmed.length > 0
  const nameSuggestionRows = useMemo(() => filteredNames.slice(0, 100), [filteredNames])

  const agentQueryTrimmed = searchAgent.trim()
  const showAgentSuggestions = agentQueryTrimmed.length > 0
  const agentSuggestionRows = useMemo(() => filteredAgents.slice(0, 100), [filteredAgents])

  const selectName = (name: string) => {
    handleMultiSelectChange('name', name)
    setSearchName('')
  }

  const selectAgent = (id: string) => {
    handleMultiSelectChange('agentIds', id)
    setSearchAgent('')
  }

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
      {/* Compact header */}
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

      {/* 2-column grid content */}
      <div className="max-h-[min(82vh,44rem)] overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">

          {/* Employment Status */}
          <div>
            <label className={SECTION_LABEL}>
              <i className="ri-user-search-line text-primary me-1" aria-hidden />Employment Status
            </label>
            <select
              className={COMPACT_SELECT}
              value={filters.employmentStatus}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, employmentStatus: e.target.value as 'current' | 'resigned' | 'all' }))}
            >
              <option value="current">Current</option>
              <option value="resigned">Resigned</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Compensation */}
          <div>
            <label className={SECTION_LABEL}>
              <i className="ri-money-dollar-circle-line text-primary me-1" aria-hidden />Compensation
            </label>
            <select
              className={COMPACT_SELECT}
              value={filters.compensationType ?? ''}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, compensationType: e.target.value as '' | 'paid' | 'unpaid' }))}
            >
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          {/* Employee ID */}
          <div>
            <label className={SECTION_LABEL}>
              <i className="ri-id-card-line text-primary me-1" aria-hidden />Employee ID
            </label>
            <input
              type="text"
              className={COMPACT_INPUT}
              placeholder="Search by ID…"
              value={filters.employeeId}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, employeeId: e.target.value }))}
            />
          </div>

          {/* Name */}
          <div>
            <label className={SECTION_LABEL}>
              <i className="ri-user-line text-primary me-1" aria-hidden />
              Name
              <span className="font-normal ms-1 text-gray-400 dark:text-gray-500">({allNames.length})</span>
            </label>
            <div className="relative">
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-[0.7rem] pointer-events-none" aria-hidden />
              <input
                ref={nameInputRef}
                type="text"
                className={COMPACT_INPUT_ICON}
                placeholder="Search names…"
                value={searchName}
                autoComplete="off"
                aria-autocomplete="list"
                onChange={(e) => setSearchName(e.target.value)}
                onBlur={() => setTimeout(() => setSearchName(''), 150)}
              />
              <PortalDropdown open={showNameSuggestions} inputRef={nameInputRef}>
                {filterOptionsLoading ? (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Loading…</div>
                ) : nameSuggestionRows.length > 0 ? (
                  nameSuggestionRows.map((name) => {
                    const selected = filters.name.includes(name)
                    return (
                      <button
                        key={name}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`${DROPDOWN_ITEM_BASE} hover:bg-primary/10 dark:hover:bg-primary/15 ${selected ? 'bg-primary/8 text-primary' : 'text-gray-800 dark:text-gray-200'}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectName(name)}
                      >
                        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-current opacity-70">
                          {selected ? <i className="ri-check-line text-[0.6rem]" aria-hidden /> : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{name}</span>
                      </button>
                    )
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No matches for &ldquo;{nameQueryTrimmed}&rdquo;</div>
                )}
              </PortalDropdown>
            </div>
            {filters.name.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {filters.name.map((name) => (
                  <span key={name} className={`${CHIP_BASE} bg-primary/10 border-primary/25 text-primary`}>
                    <span className="truncate">{name}</span>
                    <button type="button" onClick={() => handleRemoveFilter('name', name)} className="shrink-0 hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                      <i className="ri-close-line text-[0.6rem]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className={SECTION_LABEL}>
              <i className="ri-mail-line text-warning me-1" aria-hidden />Email
            </label>
            <input
              type="text"
              className={COMPACT_INPUT}
              placeholder="Search by email…"
              value={filters.email}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          {/* Agent — full width */}
          <div className="sm:col-span-2">
            <label className={SECTION_LABEL}>
              <i className="ri-user-settings-line text-primary me-1" aria-hidden />
              Agent
              <span className="font-normal ms-1 text-gray-400 dark:text-gray-500">({agentOptions.length})</span>
            </label>
            <div className="relative">
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-[0.7rem] pointer-events-none" aria-hidden />
              <input
                ref={agentInputRef}
                type="text"
                className={COMPACT_INPUT_ICON}
                placeholder="Search agents…"
                value={searchAgent}
                autoComplete="off"
                aria-autocomplete="list"
                onChange={(e) => setSearchAgent(e.target.value)}
                onBlur={() => setTimeout(() => setSearchAgent(''), 150)}
              />
              <PortalDropdown open={showAgentSuggestions} inputRef={agentInputRef}>
                {agentsLoading ? (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Loading…</div>
                ) : agentSuggestionRows.length > 0 ? (
                  agentSuggestionRows.map((a) => {
                    const selected = filters.agentIds.includes(a.id)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`${DROPDOWN_ITEM_BASE} items-start hover:bg-primary/10 dark:hover:bg-primary/15 ${selected ? 'bg-primary/8 text-primary' : 'text-gray-800 dark:text-gray-200'}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectAgent(a.id)}
                      >
                        <span className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-current opacity-70">
                          {selected ? <i className="ri-check-line text-[0.6rem]" aria-hidden /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium leading-tight">{a.name}</span>
                          <span className="block truncate text-[0.65rem] font-normal text-gray-500 dark:text-gray-400" title={a.email}>{a.email}</span>
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No matches for &ldquo;{agentQueryTrimmed}&rdquo;</div>
                )}
              </PortalDropdown>
            </div>
            {filters.agentIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {filters.agentIds.map((id) => (
                  <span key={id} className={`${CHIP_BASE} bg-primary/10 border-primary/25 text-primary`}>
                    <span className="truncate">{agentLabel(id)}</span>
                    <button type="button" onClick={() => handleRemoveFilter('agentIds', id)} className="shrink-0 hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                      <i className="ri-close-line text-[0.6rem]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default CandidatesFilterPanel
