"use client";

import React from "react";
import Select from "react-select";
import { PHONE_COUNTRIES, DEFAULT_PHONE_COUNTRY } from "@/shared/lib/phoneCountries";

/**
 * Regional-indicator flag emoji have no glyph in the Windows system font, so Chrome falls back to
 * rendering the two letters: "🇮🇳 India +91" displays as "IN India +91". Strip the flag and show
 * plain text — consistent on every platform, and without the duplicated country code.
 */
const FLAG_EMOJI_PREFIX = /^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u;

const OPTIONS = PHONE_COUNTRIES.map((c) => {
  const label = c.label.replace(FLAG_EMOJI_PREFIX, "");
  return {
    value: c.code,
    label,
    // Keep the ISO code searchable even though it is no longer displayed.
    search: `${label} ${c.code}`.toLowerCase(),
  };
});

interface PhoneCountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  /** Optional name for form compatibility */
  name?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/** Searchable country dial code selector - type to jump (e.g. "i" → India, Indonesia) */
export function PhoneCountrySelect({
  value,
  onChange,
  name,
  className = "",
  id,
  disabled = false,
}: PhoneCountrySelectProps) {
  const selected =
    OPTIONS.find((o) => o.value === value) ?? OPTIONS.find((o) => o.value === DEFAULT_PHONE_COUNTRY) ?? OPTIONS[0];

  // Caller may pass an explicit width via className (e.g. "w-40"). If absent,
  // fall back to a fixed 150px so the sibling phone input keeps room to flex.
  const callerSetsWidth = /\bw-/.test(className);
  const widthClass = callerSetsWidth ? "" : "w-[150px]";

  return (
    <div
      className={`phone-country-select shrink-0 min-w-0 ${widthClass} ${className}${
        disabled ? " phone-country-select--disabled" : ""
      }`}
    >
      <input type="hidden" name={name} value={value} />
      <Select
        inputId={id}
        options={OPTIONS}
        value={selected}
        onChange={(opt) => opt && onChange(opt.value)}
        isDisabled={disabled}
        isSearchable={!disabled}
        filterOption={(option, search) => {
          const input = search.trim().toLowerCase();
          if (!input) return true;
          return (option.data?.search ?? (option.label ?? "").toLowerCase()).includes(input);
        }}
        placeholder="Type to search..."
        classNamePrefix="react-select"
        className="react-select-container"
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: 38,
            borderRadius: 6,
            backgroundColor: state.isDisabled
              ? "rgb(var(--light) / 1)"
              : "rgb(var(--body-bg) / 1)",
            borderColor: "rgb(var(--input-border) / 1)",
            color: state.isDisabled
              ? "rgb(var(--text-muted) / 1)"
              : "rgb(var(--default-text-color) / 1)",
            cursor: state.isDisabled ? "not-allowed" : "default",
            boxShadow: state.isDisabled ? "none" : base.boxShadow,
          }),
          singleValue: (base, state) => ({
            ...base,
            color: state.isDisabled
              ? "rgb(var(--text-muted) / 1)"
              : "rgb(var(--default-text-color) / 1)",
          }),
          input: (base, state) => ({
            ...base,
            color: state.isDisabled
              ? "rgb(var(--text-muted) / 1)"
              : "rgb(var(--default-text-color) / 1)",
          }),
          placeholder: (base) => ({
            ...base,
            color: "rgb(var(--default-text-color) / 0.6)",
          }),
          menu: (base) => ({
            ...base,
            zIndex: 50,
            backgroundColor: "rgb(var(--body-bg) / 1)",
            color: "rgb(var(--default-text-color) / 1)",
            border: "1px solid rgb(var(--default-border) / 1)",
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected
              ? "rgba(99, 102, 241, 0.15)"
              : state.isFocused
                ? "rgb(var(--default-text-color) / 0.08)"
                : "transparent",
            color: "rgb(var(--default-text-color) / 1)",
            cursor: "pointer",
          }),
        }}
      />
    </div>
  );
}
