"use client";

import React, { useRef, useState } from "react";
import type { JobApplicationStatus } from "@/shared/lib/api/jobApplications";
import {
  getSelectableStatuses,
  isStatusSelectLocked,
  STATUS_STYLE,
} from "@/shared/lib/ats/applicationPipeline";
import { SimpleModal } from "@/shared/components/ui/SimpleModal";

export type ApplicationStatusSelectProps = {
  value: JobApplicationStatus;
  applicantName: string;
  disabled?: boolean;
  onChange: (next: JobApplicationStatus) => void;
  fullWidth?: boolean;
  /** Table layout: no min-width, fits fixed column. */
  compact?: boolean;
  /** Stable id for DevTools / label association (one per application row). */
  controlId?: string;
  /** Form name; defaults to `applicationStatus`. */
  name?: string;
  /** When true (default), selecting Rejected opens a confirmation dialog. */
  confirmReject?: boolean;
};

export function ApplicationStatusSelect({
  value,
  applicantName,
  disabled,
  onChange,
  fullWidth = false,
  compact = false,
  controlId,
  name = "applicationStatus",
  confirmReject = true,
}: ApplicationStatusSelectProps) {
  const [pendingReject, setPendingReject] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const options = getSelectableStatuses(value);
  const locked = isStatusSelectLocked(value);

  const applyChange = (next: JobApplicationStatus) => {
    if (next === value) return;
    if (confirmReject && next === "Rejected" && value !== "Rejected") {
      setPendingReject(true);
      return;
    }
    onChange(next);
  };

  return (
    <>
      <div
        className={`flex items-center gap-2 min-w-0 w-full ${compact ? "application-status-select" : ""}`}
      >
        <select
          id={controlId}
          name={name}
          aria-label={`Change stage for ${applicantName}`}
          title={value}
          value={value}
          disabled={disabled || locked}
          onChange={(e) => applyChange(e.target.value as JobApplicationStatus)}
          className={`ti-form-select form-select-sm w-full font-semibold rounded-full ps-2.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${STATUS_STYLE[value]} ${
            compact
              ? "application-status-select__control min-w-0 max-w-full !text-[0.6875rem] sm:!text-[0.75rem] !py-1 !min-h-0 !leading-tight !pe-7"
              : `min-w-[9rem] ${fullWidth ? "max-w-none" : "max-w-[12rem]"} text-sm sm:text-xs py-2.5 sm:py-1.5 min-h-[2.75rem] sm:min-h-0 ps-3 pe-8`
          }`}
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {disabled && (
          <i className="ri-loader-2-line animate-spin text-defaulttextcolor/50 shrink-0" aria-hidden />
        )}
      </div>

      <SimpleModal
        open={pendingReject}
        onClose={() => setPendingReject(false)}
        ariaLabel="Confirm reject"
        initialFocusRef={cancelRef}
      >
        <div className="p-4 border-b border-gray-200 dark:border-white/10">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Reject application?</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-defaulttextcolor/70 dark:text-white/70">
            {applicantName} will be moved to <strong>Rejected</strong>. They can be reopened to
            Applied, Screening, or Shortlisted later.
          </p>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => setPendingReject(false)}
            className="ti-btn ti-btn-light !text-xs !py-1.5 !px-3 !m-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingReject(false);
              onChange("Rejected");
            }}
            className="ti-btn !bg-rose-600 !text-white !text-xs !py-1.5 !px-3 !m-0"
          >
            Reject
          </button>
        </div>
      </SimpleModal>
    </>
  );
}
