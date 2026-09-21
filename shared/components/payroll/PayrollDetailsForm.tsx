"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  PAYROLL_SPEC,
  allFields,
  validateField,
  BOOLEAN_FIELDS,
  type FieldSpec,
  type PayrollCountry,
} from "@/shared/lib/payroll/spec";
import type { PayrollSubmitPayload } from "@/shared/lib/api/payrollDetails";
import {
  INVALID_FIELD,
  BTN_44,
} from "@/app/(components)/(contentlayout)/ats/pre-boarding/modals/PreBoardingDocumentsModal";

const CONFIRM_ID = "confirmAccountNumber";

/** Section ids that map 1:1 onto a payload key. A section absent from this list is
 *  silently dropped, so it must stay in step with PAYROLL_SPEC. */
export const PAYLOAD_SECTIONS: readonly string[] = ["bank", "tax", "statutory"];

export function buildPayloadFromValues(
  country: PayrollCountry,
  values: Record<string, string>
): PayrollSubmitPayload {
  const payload: PayrollSubmitPayload = { payrollCountry: country, bank: {} };
  for (const section of PAYROLL_SPEC[country]) {
    // A section with no fields is an informational block (the US Form I-9 note).
    if (!section.fields.length) continue;
    const grouped: Record<string, string | boolean> = {};
    let anyValue = false;
    for (const spec of section.fields) {
      let raw = String(values[spec.id] ?? "").trim();
      if (spec.uppercase) raw = raw.toUpperCase();
      if (!raw) continue;
      anyValue = true;
      grouped[spec.id] = BOOLEAN_FIELDS.has(spec.id) ? raw === "yes" : raw;
    }
    // An empty section must be omitted, not sent as {} — the required() keys inside
    // the country schema would reject an empty object and 400 the whole submission.
    if (!anyValue) continue;
    if (PAYLOAD_SECTIONS.includes(section.id)) {
      (payload as unknown as Record<string, unknown>)[section.id] = grouped;
    }
  }
  return payload;
}

interface Props {
  country: PayrollCountry;
  initial?: Record<string, string>;
  disabled?: boolean;
  submitLabel: string;
  onDirtyChange?: (dirty: boolean) => void;
  onSubmit: (payload: PayrollSubmitPayload) => Promise<void>;
}

function describedBy(id: string, hasHelp: boolean, hasError: boolean): string | undefined {
  const parts = [
    hasHelp ? `${id}-help` : null,
    hasError ? `${id}-error` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

const PayrollDetailsForm: React.FC<Props> = ({
  country,
  initial,
  disabled = false,
  submitLabel,
  onDirtyChange,
  onSubmit,
}) => {
  const sections = PAYROLL_SPEC[country];
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...(initial || {}) }));
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const dirtyRef = useRef(false);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    setValues({ ...(initial || {}) });
    setErrors({});
  }, [country, initial]);

  const markDirty = () => {
    if (dirtyRef.current) return;
    dirtyRef.current = true;
    onDirtyChange?.(true);
  };

  const setValue = (id: string, raw: string, spec?: FieldSpec) => {
    markDirty();
    const next = spec?.uppercase ? raw.toUpperCase() : raw;
    setValues((prev) => ({ ...prev, [id]: next }));
  };

  const confirmError = (account: string, confirm: string): string | null => {
    if (!account && !confirm) return null;
    if (confirm !== account) return "Account numbers do not match";
    return null;
  };

  const onBlurField = (spec: FieldSpec) => {
    const raw = values[spec.id] || "";
    setErrors((prev) => ({ ...prev, [spec.id]: validateField(spec, raw) }));
    if (spec.id === "accountNumber") {
      setErrors((prev) => ({
        ...prev,
        [CONFIRM_ID]: confirmError(raw, values[CONFIRM_ID] || ""),
      }));
    }
  };

  const onBlurConfirm = () => {
    setErrors((prev) => ({
      ...prev,
      [CONFIRM_ID]: confirmError(values.accountNumber || "", values[CONFIRM_ID] || ""),
    }));
  };

  const validateAll = (): string | null => {
    const next: Record<string, string | null> = {};
    let firstInvalid: string | null = null;
    for (const spec of allFields(country)) {
      const message = validateField(spec, values[spec.id] || "");
      next[spec.id] = message;
      if (message && !firstInvalid) firstInvalid = spec.id;
      if (spec.id === "accountNumber") {
        const mismatch = confirmError(values.accountNumber || "", values[CONFIRM_ID] || "");
        next[CONFIRM_ID] = mismatch;
        if (mismatch && !firstInvalid) firstInvalid = CONFIRM_ID;
      }
    }
    setErrors(next);
    return firstInvalid;
  };

  const buildPayload = (): PayrollSubmitPayload => buildPayloadFromValues(country, values);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || submitting) return;
    const firstInvalid = validateAll();
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(buildPayload());
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (spec: FieldSpec) => {
    const id = spec.id;
    const value = values[id] || "";
    const error = errors[id] || null;
    const helpId = `${id}-help`;
    const errorId = `${id}-error`;
    const shown = Boolean(showSensitive[id]);

    if (spec.type === "select") {
      return (
        <fieldset key={id} className="min-w-0" disabled={disabled}>
          <legend className="form-label">{spec.label}</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={undefined}>
            {(spec.options || []).map((opt) => {
              const radioId = `${id}-${opt.value}`;
              const checked = value === opt.value;
              return (
                <label
                  key={opt.value}
                  htmlFor={radioId}
                  className={`${BTN_44} cursor-pointer rounded-lg border px-3 ${
                    checked
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-slate-200/90 bg-white dark:border-white/10 dark:bg-bodybg"
                  }`}
                >
                  <input
                    ref={(el) => {
                      if (opt.value === (spec.options || [])[0]?.value) {
                        fieldRefs.current[id] = el;
                      }
                    }}
                    id={radioId}
                    type="radio"
                    name={id}
                    value={opt.value}
                    checked={checked}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy(id, Boolean(spec.help), Boolean(error))}
                    onChange={() => setValue(id, opt.value, spec)}
                    onBlur={() => onBlurField(spec)}
                    className="me-2"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
          {spec.help ? (
            <p id={helpId} className="mb-0 mt-1 text-xs text-slate-500 dark:text-slate-400">
              {spec.help}
            </p>
          ) : null}
          {error ? (
            <p id={errorId} role="alert" className="mb-0 mt-1 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </p>
          ) : null}
        </fieldset>
      );
    }

    const isSensitive = Boolean(spec.sensitive);
    const inputType = isSensitive && !shown ? "password" : "text";

    return (
      <div key={id} className="min-w-0">
        <label className="form-label" htmlFor={id}>
          {spec.label}
        </label>
        <div className="relative">
          <input
            ref={(el) => {
              fieldRefs.current[id] = el;
            }}
            id={id}
            name={id}
            type={inputType}
            inputMode={spec.numeric ? "numeric" : undefined}
            autoComplete="off"
            disabled={disabled}
            maxLength={spec.maxLength}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(id, Boolean(spec.help), Boolean(error))}
            className={`form-control ${error ? INVALID_FIELD : ""} ${isSensitive ? "pe-12" : ""}`}
            onChange={(e) => setValue(id, e.target.value, spec)}
            onBlur={() => onBlurField(spec)}
          />
          {isSensitive ? (
            <button
              type="button"
              className={`${BTN_44} absolute end-1 top-1/2 -translate-y-1/2 !px-2`}
              onClick={() => setShowSensitive((prev) => ({ ...prev, [id]: !shown }))}
              aria-pressed={shown}
              aria-label={shown ? `Hide ${spec.label}` : `Show ${spec.label}`}
              disabled={disabled}
            >
              <i className={shown ? "ri-eye-off-line" : "ri-eye-line"} aria-hidden />
            </button>
          ) : null}
        </div>
        {spec.help ? (
          <p id={helpId} className="mb-0 mt-1 text-xs text-slate-500 dark:text-slate-400">
            {spec.help}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="mb-0 mt-1 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  const renderConfirm = () => {
    const value = values[CONFIRM_ID] || "";
    const error = errors[CONFIRM_ID] || null;
    const shown = Boolean(showSensitive[CONFIRM_ID]);
    return (
      <div className="min-w-0">
        <label className="form-label" htmlFor={CONFIRM_ID}>
          Confirm account number
        </label>
        <div className="relative">
          <input
            ref={(el) => {
              fieldRefs.current[CONFIRM_ID] = el;
            }}
            id={CONFIRM_ID}
            name={CONFIRM_ID}
            type={shown ? "text" : "password"}
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${CONFIRM_ID}-error` : undefined}
            className={`form-control pe-12 ${error ? INVALID_FIELD : ""}`}
            onChange={(e) => setValue(CONFIRM_ID, e.target.value)}
            onBlur={onBlurConfirm}
          />
          <button
            type="button"
            className={`${BTN_44} absolute end-1 top-1/2 -translate-y-1/2 !px-2`}
            onClick={() => setShowSensitive((prev) => ({ ...prev, [CONFIRM_ID]: !shown }))}
            aria-pressed={shown}
            aria-label={shown ? "Hide confirm account number" : "Show confirm account number"}
            disabled={disabled}
          >
            <i className={shown ? "ri-eye-off-line" : "ri-eye-line"} aria-hidden />
          </button>
        </div>
        {error ? (
          <p id={`${CONFIRM_ID}-error`} role="alert" className="mb-0 mt-1 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`payroll-section-${section.id}`}>
          <h5 id={`payroll-section-${section.id}`} className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {section.title}
          </h5>
          {section.description ? (
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
          ) : null}
          {section.fields.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {section.fields.map((spec) => (
                <React.Fragment key={spec.id}>
                  {renderField(spec)}
                  {spec.id === "accountNumber" ? renderConfirm() : null}
                </React.Fragment>
              ))}
            </div>
          ) : null}
        </section>
      ))}
      <div>
        <button type="submit" className={`ti-btn ti-btn-primary ${BTN_44}`}>
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default PayrollDetailsForm;
