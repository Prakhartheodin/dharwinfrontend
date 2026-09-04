"use client";

import React, { useMemo } from "react";
import Select, { type FilterOptionOption } from "react-select";
import { atsSelectStyles } from "@/shared/lib/reactSelectTheme";
import type { ActivityLogSelectGroup, ActivityLogSelectOption } from "@/shared/lib/activity-log-catalog";

export interface ActivityLogFilterSelectProps {
  inputId: string;
  groups: ActivityLogSelectGroup[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  noOptionsMessage?: string;
  /** Platform audit shows the raw technical key inline (forensic use); consumer audit keeps it out of the closed control. */
  showKeyInValue?: boolean;
}

function filterOption(option: FilterOptionOption<ActivityLogSelectOption>, rawInput: string): boolean {
  const input = rawInput.trim().toLowerCase();
  if (!input) return true;
  const { label, value, data } = option;
  return (
    label.toLowerCase().includes(input) ||
    value.toLowerCase().includes(input) ||
    (data.description ?? "").toLowerCase().includes(input)
  );
}

/** Searchable, grouped replacement for the flat native `<select>` used to filter Log Audit / Platform Audit by action or entity type. */
export function ActivityLogFilterSelect({
  inputId,
  groups,
  value,
  onChange,
  placeholder,
  noOptionsMessage = "No matching options",
  showKeyInValue = false,
}: ActivityLogFilterSelectProps) {
  const selected = useMemo(() => {
    if (!value) return null;
    for (const group of groups) {
      const match = group.options.find((o) => o.value === value);
      if (match) return match;
    }
    return null;
  }, [groups, value]);

  return (
    <Select<ActivityLogSelectOption, false>
      inputId={inputId}
      options={groups}
      value={selected}
      onChange={(opt) => onChange(opt?.value ?? "")}
      isClearable
      placeholder={placeholder}
      styles={atsSelectStyles<ActivityLogSelectOption>()}
      filterOption={filterOption}
      formatGroupLabel={(group) => (
        <div className="flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-wide text-defaulttextcolor/55">
          <span>{group.label}</span>
          <span className="text-defaulttextcolor/35 normal-case font-normal">{group.options.length}</span>
        </div>
      )}
      formatOptionLabel={(option, meta) => (
        <div className="flex flex-col py-0.5 leading-tight">
          <span>{option.label}</span>
          {(meta.context === "menu" || showKeyInValue) && (
            <span className="text-[0.7rem] font-mono text-defaulttextcolor/50">{option.value}</span>
          )}
        </div>
      )}
      noOptionsMessage={() => noOptionsMessage}
    />
  );
}
