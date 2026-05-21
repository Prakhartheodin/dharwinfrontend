'use client'
import React, { useMemo } from 'react'
import Select from 'react-select'
import { listTimezones, normalizeTimezone, getZoneOffsetLabel } from '@/shared/lib/timezone'
import { atsSelectStyles } from './reactSelectTheme'

/** Zones pinned to a "Common" group at the top of the list. */
const PINNED = ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London']

interface TzOption { value: string; label: string }

export interface TimezoneSelectProps {
  /** Current IANA zone. */
  value: string
  /** Called with the normalized IANA zone when the user picks one. */
  onChange: (tz: string) => void
  /** id applied to the inner input (for an associated <label>). */
  id?: string
}

const optionFor = (tz: string): TzOption => ({
  value: tz,
  label: `${tz}  ${getZoneOffsetLabel(tz)}`,
})

export default function TimezoneSelect({ value, onChange, id }: TimezoneSelectProps) {
  const groups = useMemo(() => {
    const all = listTimezones()
    const pinned = PINNED.filter((tz) => all.includes(tz)).map(optionFor)
    const rest = all.filter((tz) => !PINNED.includes(tz)).map(optionFor)
    return [
      { label: 'Common', options: pinned },
      { label: 'All time zones', options: rest },
    ]
  }, [])

  const selected = useMemo<TzOption>(() => optionFor(normalizeTimezone(value)), [value])

  return (
    <Select<TzOption>
      inputId={id}
      aria-label="Time zone"
      classNamePrefix="ats-select"
      options={groups}
      value={selected}
      onChange={(opt) => { if (opt) onChange(normalizeTimezone(opt.value)) }}
      isSearchable
      menuPlacement="auto"
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      styles={atsSelectStyles<TzOption>()}
    />
  )
}
