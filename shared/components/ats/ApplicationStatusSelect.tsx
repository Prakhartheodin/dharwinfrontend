"use client";

import React, { useState } from "react";
import type { JobApplicationStatus } from "@/shared/lib/api/jobApplications";
import {
  getSelectableStatuses,
  isStatusSelectLocked,
  STATUS_STYLE,
} from "@/shared/lib/ats/applicationPipeline";

export type ApplicationStatusSelectProps = {
  value: JobApplicationStatus;
  applicantName: string;
  disabled?: boolean;
  onChange: (next: JobApplicationStatus) => void;
  fullWidth?: boolean;
  /** When true (default), selecting Rejected opens a confirmation dialog. */
  confirmReject?: boolean;
};

export function ApplicationStatusSelect({
  value,
  applicantName,
  disabled,
  onChange,
  fullWidth = false,
  confirmReject = true,
}: ApplicationStatusSelectProps) {
  const [pendingReject, setPendingReject] = useState(false);
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
      <div className="flex items-center gap-2 min-w-0 w-full">
        <select
          aria-label={`Change stage for ${applicantName}`}
          value={value}
          disabled={disabled || locked}
          onChange={(e) => applyChange(e.target.value as JobApplicationStatus)}
          className={`ti-form-select form-select-sm w-full min-w-[9rem] ${fullWidth ? "max-w-none" : "max-w-[12rem]"} text-sm sm:text-xs font-semibold rounded-full py-2.5 sm:py-1.5 min-h-[2.75rem] sm:min-h-0 ps-3 pe-8 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${STATUS_STYLE[value]}`}
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {disabled && (
          <i className="ri-loader-2-line animate-spin text-[#8c9097] shrink-0" aria-hidden />
        )}
      </div>

      {pendingReject && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm reject"
          onClick={() => setPendingReject(false)}
        >
          <div
            className="bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Reject application?
              </h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-[#8c9097] dark:text-white/70">
                {applicantName} will be moved to <strong>Rejected</strong>. They can be reopened to
                Applied, Screening, or Shortlisted later.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-2">
              <button
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
          </div>
        </div>
      )}
    </>
  );
}
