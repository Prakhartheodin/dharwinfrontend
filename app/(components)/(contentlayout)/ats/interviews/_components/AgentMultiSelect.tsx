'use client'
import React, { useMemo } from 'react'
import Select, { components, type MultiValueGenericProps } from 'react-select'
import type { AgentOption } from '@/shared/lib/api/employees'
import { atsSelectStyles } from './reactSelectTheme'

interface AgentSelOption { value: string; label: string; name: string; email: string }

export interface AgentMultiSelectProps {
  /** Live agent options from GET /employees/agents. */
  options: AgentOption[]
  loading: boolean
  error: string | null
  /** Selected agent ids (controlled). */
  value: string[]
  onChange: (ids: string[]) => void
  /** id of the agent auto-filled from the candidate — gets an "auto" badge. */
  autoFilledId?: string | null
  /** Called by the error-state retry button. */
  onRetry?: () => void
  /** id applied to the inner input. */
  id?: string
}

const AGENT_TAG = (
  <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
    Agent
  </span>
)

export default function AgentMultiSelect({
  options, loading, error, value, onChange, autoFilledId, onRetry, id,
}: AgentMultiSelectProps) {
  const opts = useMemo<AgentSelOption[]>(
    () => options.map((a) => ({
      value: a.id,
      label: a.name || a.email,
      name: a.name || a.email,
      email: a.email,
    })),
    [options]
  )
  const selected = useMemo(
    () => opts.filter((o) => value.includes(o.value)),
    [opts, value]
  )

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-danger/25 bg-danger/5 p-2.5">
        <span className="text-sm text-danger">Couldn&apos;t load agents.</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="ti-btn ti-btn-light !py-1 !px-2 !text-xs">
            Retry
          </button>
        )}
      </div>
    )
  }

  const MultiValueLabel = (props: MultiValueGenericProps<AgentSelOption>) => {
    const opt = props.data as AgentSelOption
    return (
      <components.MultiValueLabel {...props}>
        <span className="inline-flex items-center gap-1">
          {opt.name}
          {opt.value === autoFilledId && (
            <span className="text-[0.6rem] font-bold text-primary">auto</span>
          )}
        </span>
      </components.MultiValueLabel>
    )
  }

  return (
    <Select<AgentSelOption, true>
      inputId={id}
      aria-label="Agents"
      classNamePrefix="ats-select"
      isMulti
      isLoading={loading}
      isDisabled={loading}
      options={opts}
      value={selected}
      onChange={(vals) => onChange(vals.map((v) => v.value))}
      placeholder={loading ? 'Loading agents…' : 'Select agents'}
      noOptionsMessage={() => 'No agents available'}
      menuPlacement="auto"
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      components={{ MultiValueLabel }}
      formatOptionLabel={(opt) => (
        <span className="flex items-center gap-2">
          {AGENT_TAG}
          <span className="font-medium">{opt.name}</span>
          <span className="text-xs text-textmuted">{opt.email}</span>
        </span>
      )}
      styles={atsSelectStyles<AgentSelOption, true>()}
    />
  )
}
