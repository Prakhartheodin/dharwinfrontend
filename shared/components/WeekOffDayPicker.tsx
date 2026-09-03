"use client";

import React, { useId } from "react";
import { WEEK_OFF_DAYS, WEEK_OFF_DAY_ABBREV } from "@/shared/lib/api/students";

export type WeekOffDayPickerVariant = "pill" | "inline";

export interface WeekOffDayPickerProps {
  selectedDays: string[];
  onToggleDay: (day: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  variant?: WeekOffDayPickerVariant;
  legend?: string;
  showBulkActions?: boolean;
  showSummary?: boolean;
  summaryId?: string;
  className?: string;
}

function DayCheckboxIndicator({
  isPill,
  isSelected,
}: {
  isPill: boolean;
  isSelected: boolean;
}) {
  const boxClass = isPill
    ? isSelected
      ? "border-white bg-white text-primary"
      : "border-[rgb(var(--primary)/0.45)] bg-white text-primary dark:border-[rgb(var(--primary)/0.5)] dark:bg-bodybg"
    : isSelected
      ? "border-primary bg-primary text-white"
      : "border-[rgb(var(--primary)/0.45)] bg-white text-primary dark:border-[rgb(var(--primary)/0.5)] dark:bg-bodybg";

  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${boxClass}`}
      aria-hidden="true"
    >
      {isSelected && <i className="ri-check-line text-[10px] leading-none" />}
    </span>
  );
}

export default function WeekOffDayPicker({
  selectedDays,
  onToggleDay,
  onSelectAll,
  onClearAll,
  variant = "pill",
  legend = "Select Week-Off Days",
  showBulkActions = false,
  showSummary = false,
  summaryId: summaryIdProp,
  className,
}: WeekOffDayPickerProps) {
  const baseId = useId();
  const summaryId = summaryIdProp ?? `${baseId}-summary`;
  const isPill = variant === "pill";
  const hasSummary = showSummary && selectedDays.length > 0;

  return (
    <fieldset
      className={`m-0 min-w-0 border-0 p-0 ${className ?? ""}`}
      aria-describedby={hasSummary ? summaryId : undefined}
    >
      <div
        className={
          isPill
            ? "mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            : "mb-2"
        }
      >
        <legend
          className={`float-none w-auto p-0 ${
            isPill ? "text-sm font-semibold text-defaulttextcolor" : "form-label"
          }`}
        >
          {legend}
        </legend>
        {showBulkActions && onSelectAll && onClearAll && (
          <div className="flex gap-2" role="group" aria-label="Week-off day bulk actions">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Select All
            </button>
            <span className="text-defaulttextcolor/40" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={onClearAll}
              className="text-sm font-medium text-defaulttextcolor/80 transition-colors hover:text-defaulttextcolor"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      <div className={`flex flex-wrap ${isPill ? "gap-3" : "gap-2"}`}>
        {WEEK_OFF_DAYS.map((day) => {
          const inputId = `${baseId}-${day}`;
          const isSelected = selectedDays.includes(day);

          if (isPill) {
            return (
              <label
                key={day}
                htmlFor={inputId}
                className={`flex min-h-11 min-w-0 cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-2 shadow-sm transition-colors duration-200 focus-within:ring-2 focus-within:ring-primary/25 sm:gap-2 sm:px-3 sm:py-3 ${
                  isSelected
                    ? "!border-primary !bg-primary !text-white shadow-md ring-1 ring-primary/40 hover:!bg-primary/90 focus-within:!border-primary focus-within:ring-white/30"
                    : "border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.08)] hover:border-[rgb(var(--primary)/0.45)] hover:bg-[rgb(var(--primary)/0.12)] dark:border-[rgb(var(--primary)/0.38)] dark:bg-[rgb(var(--primary)/0.12)] dark:hover:border-[rgb(var(--primary)/0.55)] dark:hover:bg-[rgb(var(--primary)/0.18)] focus-within:border-[rgb(var(--primary)/0.5)]"
                }`}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleDay(day)}
                  aria-label={day}
                  className="sr-only"
                />
                <DayCheckboxIndicator isPill isSelected={isSelected} />
                <span
                  className={`min-w-0 truncate text-sm font-medium ${
                    isSelected ? "text-white" : "text-defaulttextcolor"
                  }`}
                  title={day}
                >
                  <span className="md:hidden">{WEEK_OFF_DAY_ABBREV[day]}</span>
                  <span className="hidden md:inline">{day}</span>
                </span>
              </label>
            );
          }

          return (
            <label
              key={day}
              htmlFor={inputId}
              className={`flex min-h-11 min-w-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors duration-200 sm:gap-2 ${
                isSelected
                  ? "!border-primary/30 !bg-[rgb(var(--primary)/0.12)] ring-1 ring-primary/30"
                  : "border-transparent bg-[rgb(var(--primary)/0.05)] hover:border-[rgb(var(--primary)/0.25)] hover:bg-[rgb(var(--primary)/0.1)] dark:bg-[rgb(var(--primary)/0.08)] dark:hover:border-[rgb(var(--primary)/0.35)] dark:hover:bg-[rgb(var(--primary)/0.14)]"
              }`}
            >
              <input
                id={inputId}
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleDay(day)}
                aria-label={day}
                className="sr-only"
              />
              <DayCheckboxIndicator isPill={false} isSelected={isSelected} />
              <span
                className={`min-w-0 truncate text-sm ${isSelected ? "font-medium text-primary" : ""}`}
                title={day}
              >
                <span className="md:hidden">{WEEK_OFF_DAY_ABBREV[day]}</span>
                <span className="hidden md:inline">{day}</span>
              </span>
            </label>
          );
        })}
      </div>

      {hasSummary && (
        <p id={summaryId} className="mt-3 text-sm text-defaulttextcolor/70">
          <strong>Selected:</strong> {selectedDays.join(", ")}
        </p>
      )}
    </fieldset>
  );
}
