"use client";

import dynamic from "next/dynamic";
import { useId, useRef, useState } from "react";
import Swal from "sweetalert2";
import { formatYmdLocal, parseYmdLocal } from "@/shared/lib/leave-date-range";
import {
  describeDmyProblem,
  maskDmyInput,
  sanitizeReferralLeadsDateInput,
} from "@/shared/lib/ymd-filter-date-input.util";

const DatePicker = dynamic(() => import("react-datepicker").then((mod) => mod.default), { ssr: false });

const INVALID_DATE_MESSAGE = "Enter a valid date (dd/mm/yyyy)";
const INVALID_DATE_POPUP_TITLE = "Date format is wrong";
// A date that is well formed but does not exist is not a formatting mistake -- saying so
// would send the user back to re-check separators they already got right.
const IMPOSSIBLE_DATE_POPUP_TITLE = "That date does not exist";
/** Long enough to read one sentence, short enough not to feel stuck. */
const DATE_POPUP_TIMEOUT_MS = 3000;
const INVALID_DATE_POPUP_TEXT = "Please input date in dd/mm/yyyy format.";
/** Overrides global `.form-control { placeholder:opacity-40 }` so filter placeholders stay readable. */
export const FILTER_BAR_PLACEHOLDER_CLASS =
  "placeholder:!opacity-100 placeholder:text-defaulttextcolor/60 dark:placeholder:text-white/70";

/** Matches adjacent filter-bar `form-control` inputs (search/selects), not global react-datepicker `bodybg2`. */
const DEFAULT_FILTER_INPUT_CLASS = "form-control form-control-sm w-[150px] dark:!bg-bodybg";

interface YmdFilterDateInputProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  rangeError?: string | null;
  /** Keep the accessible name but hide the visible label (section headings supply it). */
  hideLabel?: boolean;
  /** Stable id, so a sibling field can hand focus over once this one is filled. */
  inputId?: string;
  portalId?: string;
  popperClassName?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  /** Override the label styling for a bar whose other labels do not use `form-label`. */
  labelClassName?: string;
}

function toPickerDate(ymd: string | undefined): Date | undefined {
  if (!ymd) return undefined;
  const parsed = parseYmdLocal(ymd);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
}

export function YmdFilterDateInput({
  label,
  value,
  onCommit,
  minDate,
  maxDate,
  rangeError = null,
  hideLabel = false,
  inputId: inputIdProp,
  portalId,
  popperClassName = "!z-[60]",
  inputClassName,
  wrapperClassName,
  labelClassName,
}: YmdFilterDateInputProps) {
  const generatedId = useId();
  const inputId = inputIdProp ?? generatedId;
  const errorId = `${inputId}-error`;
  const [inputError, setInputError] = useState<string | null>(null);
  // Previous raw text, so a backspace over a trailing separator is not undone by the mask.
  const lastRawRef = useRef("");
  // Opening a dialog blurs the input, which would fire the blur popup on top of the one
  // just shown. Set while a typing-time popup is up so the blur handler stands down once.
  const popupShownRef = useRef(false);

  const selected = value ? parseYmdLocal(value) : null;
  const error = inputError ?? rangeError;

  const reportDateProblem = (message: string, title: string) => {
    setInputError(message);
    void Swal.fire({
      icon: "error",
      title,
      text: message,
      // The message is one line and there is nothing to decide, so it closes itself rather
      // than making the user dismiss a dialog to get back to the field they were typing in.
      timer: DATE_POPUP_TIMEOUT_MS,
      // Never take the page away without showing that it is on a clock.
      timerProgressBar: true,
    }).then(() => {
      // Runs on the timer too, not just on OK: hand the caret back to the field that
      // failed, so the fix needs no extra click.
      document.getElementById(inputId)?.focus();
    });
  };

  const digitCount = (text: string) => (text ?? "").replace(/\D+/g, "").length;

  const handleChange = (date: Date | null) => {
    if (!date) {
      setInputError(null);
      if (value !== "") onCommit("");
      return;
    }
    const ymd = formatYmdLocal(date);
    setInputError(null);
    if (ymd !== value) onCommit(ymd);
  };

  // react-datepicker calls onChangeRaw before it parses, and then reads event.target.value
  // again, so rewriting the value here is what puts the separators on screen as you type.
  const handleChangeRaw = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event?.target;
    if (!input) return;
    const raw = input.value ?? "";
    // Month/year dropdowns and some calendar clicks fire onChangeRaw without a string value.
    if (!raw && !lastRawRef.current) return;
    // A paste or a mid-string edit would have its caret thrown to the end by the rewrite,
    // so only punctuate while typing at the end -- the case the separators are for.
    if (input.selectionStart !== null && input.selectionStart < raw.length) return;
    const masked = maskDmyInput(raw, lastRawRef.current);
    const before = digitCount(lastRawRef.current);
    lastRawRef.current = masked;
    if (masked !== raw) input.value = masked;

    // Judge a segment only on the keystroke that completes it -- day at 2 digits, month at
    // 4, year at 8. Checking every keystroke would fire on the "3" of a perfectly good 31,
    // and re-checking while deleting would trap the user in the dialog they are backing out of.
    const after = digitCount(masked);
    if (after <= before || (after !== 2 && after !== 4 && after !== 8)) return;
    const problem = describeDmyProblem(masked);
    if (!problem) {
      setInputError(null);
      return;
    }
    popupShownRef.current = true;
    reportDateProblem(problem, IMPOSSIBLE_DATE_POPUP_TITLE);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const raw = event.target.value ?? "";
    if (!raw.trim()) {
      setInputError(null);
      if (value !== "") onCommit("");
      return;
    }
    const sanitized = sanitizeReferralLeadsDateInput(raw);
    if (sanitized === null) {
      // A real date that simply does not exist gets named; anything else is a format problem.
      const problem = describeDmyProblem(raw);
      // The inline message stays either way: it survives the dismiss, and screen readers
      // get it from the field's own alert region rather than from a transient dialog.
      setInputError(problem ?? INVALID_DATE_MESSAGE);
      // The dialog that just blurred this field already said it -- do not say it twice.
      if (popupShownRef.current) {
        popupShownRef.current = false;
        return;
      }
      reportDateProblem(
        problem ?? INVALID_DATE_POPUP_TEXT,
        problem ? IMPOSSIBLE_DATE_POPUP_TITLE : INVALID_DATE_POPUP_TITLE
      );
      return;
    }
    popupShownRef.current = false;
    setInputError(null);
    if (sanitized !== value) onCommit(sanitized);
  };

  return (
    <div className={["ymd-filter-date-input", "[&_.react-datepicker__input-container_input]:!rounded-xl", wrapperClassName].filter(Boolean).join(" ")}>
      <label htmlFor={inputId} className={hideLabel ? "sr-only" : labelClassName ?? "form-label text-xs"}>
        {label}
      </label>
      <DatePicker
        id={inputId}
        selected={selected && !Number.isNaN(selected.getTime()) ? selected : null}
        onChange={handleChange}
        onChangeRaw={handleChangeRaw}
        onBlur={handleBlur}
        dateFormat="dd/MM/yyyy"
        placeholderText="dd/mm/yyyy"
        // Without this react-datepicker parses every keystroke loosely and falls back to
        // `new Date(value)` (dist/index.js parseDate). `new Date("2")` is Feb 1 2001, so the
        // first digit of a typed year committed a date and remounted the field mid-word.
        // strictParsing only accepts input that round-trips through dateFormat.
        strictParsing
        isClearable
        autoComplete="off"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        calendarStartDay={1}
        minDate={toPickerDate(minDate)}
        maxDate={toPickerDate(maxDate)}
        // Rendered inline, the popup is clipped by the filter card and floating-ui's
        // flip/shift middleware can only reposition inside that clipping box. A body
        // portal makes the viewport the boundary, so collision handling works.
        // Per-field node: From and To sharing one portal id would have them mount and
        // unmount the same element if both are ever open at once.
        portalId={portalId ?? `ymd-filter-datepicker-portal-${label.toLowerCase()}`}
        // floating-ui defaults to `bottom` (centred): a ~280px calendar under a 150px
        // input overhangs ~65px each side. Anchor its start edge to the input instead.
        popperPlacement="bottom-start"
        popperClassName={popperClassName}
        calendarClassName="filter-dp-cal"
        wrapperClassName={wrapperClassName}
        className={`${inputClassName ?? DEFAULT_FILTER_INPUT_CLASS} ${FILTER_BAR_PLACEHOLDER_CLASS} text-defaulttextcolor dark:text-white ${error ? "is-invalid" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={rangeError ? errorId : undefined}
      />
      {/* Typing mistakes are reported by the dialog alone -- printing them here as well
          wrapped to three lines and shoved the neighbouring field down the page. The range
          warning stays: it has no dialog of its own, so this is its only way to be seen. */}
      {rangeError ? (
        <p
          id={errorId}
          // `invalid-feedback` is a dead class in this theme -- it has no rule, so the
          // message was rendering in ordinary body colour and did not read as an error.
          className={`text-danger text-xs mt-0.5 mb-0 ${inputClassName ? "" : "max-w-[150px]"}`}
          aria-live="polite"
          role="alert"
        >
          {rangeError}
        </p>
      ) : null}
    </div>
  );
}
