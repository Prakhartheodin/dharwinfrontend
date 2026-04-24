"use client";

import React from "react";
import Select from "react-select";
import { PHONE_COUNTRIES, DEFAULT_PHONE_COUNTRY } from "@/shared/lib/phoneCountries";

const OPTIONS = PHONE_COUNTRIES.map((c) => ({
  value: c.code,
  label: c.label,
}));

interface PhoneCountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  /** Optional name for form compatibility */
  name?: string;
  className?: string;
  id?: string;
}

/** Searchable country dial code selector - type to jump (e.g. "i" → India, Indonesia) */
export function PhoneCountrySelect({ value, onChange, name, className = "", id }: PhoneCountrySelectProps) {
  const selected =
    OPTIONS.find((o) => o.value === value) ?? OPTIONS.find((o) => o.value === DEFAULT_PHONE_COUNTRY) ?? OPTIONS[0];

  return (
    <div className={className} style={{ minWidth: 140 }}>
      <input type="hidden" name={name} value={value} />
      <Select
        inputId={id}
        options={OPTIONS}
        value={selected}
        onChange={(opt) => opt && onChange(opt.value)}
        isSearchable
        filterOption={(option, search) => {
          const input = search.trim().toLowerCase();
          if (!input) return true;
          const label = (option.label ?? "").toLowerCase();
          return label.includes(input);
        }}
        placeholder="Type to search..."
        classNamePrefix="react-select"
        className="react-select-container"
        styles={{
          control: (base) => ({
            ...base,
            minHeight: 38,
            borderRadius: 6,
          }),
          menu: (base) => ({
            ...base,
            zIndex: 50,
          }),
        }}
      />
    </div>
  );
}
