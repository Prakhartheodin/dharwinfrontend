"use client";

import React from "react";
import Swal from "sweetalert2";

/**
 * Asked before a newly uploaded resume overwrites the skills, experience, qualifications and
 * social links read from a previous one — the user may have pruned or corrected those by hand,
 * and replacing them silently loses that work with no undo.
 *
 * Contact fields need no such prompt: `applyPrefill` only writes a field that is still empty and
 * untouched, so a second resume can never overwrite a name, email or phone already on the form.
 */
export async function confirmReplaceParsedDetails(): Promise<boolean> {
  const result = await Swal.fire({
    icon: "question",
    title: "Replace details from your previous resume?",
    text: "We already filled in skills, experience and qualifications from your earlier resume. Reading this file replaces them, including any edits you made.",
    showCancelButton: true,
    confirmButtonText: "Use this resume",
    cancelButtonText: "Keep current details",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

/**
 * Field-level validation and prefill primitives shared by the two public apply forms
 * (`/public-job/[jobId]` and the authenticated `PublicJobApplyModal`). Both previously funnelled
 * every validation failure into a single banner above a form that scrolls, leaving the offending
 * field off-screen and unmarked, and each declared its own copy of the password rules.
 */

export const PASSWORD_MIN_LENGTH = 8;
/** Matches backend `custom.validation.js` password rules. */
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)/;

/** Field keys that can carry an inline error, in the order they appear in the form. */
export const APPLY_FIELD_ORDER = [
  "fullName",
  "email",
  "phoneNumber",
  "resume",
  "password",
  "confirmPassword",
] as const;

export type ApplyFieldKey = (typeof APPLY_FIELD_ORDER)[number];
export type ApplyFieldErrors = Partial<Record<ApplyFieldKey, string>>;

/** Live password rules, rendered as a checklist so they survive the first keystroke. */
export const PASSWORD_RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (v) => v.length >= PASSWORD_MIN_LENGTH },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One number", test: (v) => /\d/.test(v) },
];

export function hasFieldErrors(errors: ApplyFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function countFieldErrors(errors: ApplyFieldErrors): number {
  return Object.values(errors).filter(Boolean).length;
}

/** Summary line for the form-level alert, which anchors the per-field messages below it. */
export function fieldErrorSummary(errors: ApplyFieldErrors): string {
  const count = countFieldErrors(errors);
  return count === 1 ? "One field needs your attention." : `${count} fields need your attention.`;
}

/**
 * Moves focus to the first field needing attention so the user is not hunting up a scrolled form.
 * @param inputIds maps each field key to the DOM id of its input in the calling form.
 */
export function focusFirstInvalidField(errors: ApplyFieldErrors, inputIds: Record<ApplyFieldKey, string>) {
  const first = APPLY_FIELD_ORDER.find((key) => errors[key]);
  if (!first) return;
  const el = document.getElementById(inputIds[first]);
  el?.focus();
  el?.scrollIntoView({ block: "center", behavior: "smooth" });
}

/** Border classes for an input, red when that field failed validation. */
export function fieldBorderClass(invalid: boolean): string {
  return invalid ? "border-red-400 dark:border-red-700" : "border-gray-300 dark:border-gray-600";
}

/** Error text tied to one field via aria-describedby, announced when it appears. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
      <i className="ri-error-warning-line mt-px shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}

/** Marks an input whose value came from the parsed resume, making "please review" actionable. */
export function PrefilledBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
      <i className="ri-sparkling-line" aria-hidden />
      From resume
    </span>
  );
}

/** Persistent password requirements — as a placeholder they vanished on the first keystroke. */
export function PasswordRulesList({ id, value }: { id: string; value: string }) {
  return (
    <ul id={id} className="mt-1.5 space-y-0.5">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-xs ${
              met ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-gray-400"
            }`}
          >
            <i className={met ? "ri-check-line" : "ri-subtract-line"} aria-hidden />
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
