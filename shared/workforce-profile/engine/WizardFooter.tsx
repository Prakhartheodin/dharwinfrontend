"use client";

import React from "react";

type Props = {
  isFirst: boolean;
  isLast: boolean;
  isSaving: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  sticky?: boolean;
  /** Render the submit button on every step (in addition to Next), so a
   *  self-service edit can be saved without walking the whole wizard. */
  alwaysShowSubmit?: boolean;
  /** When alwaysShowSubmit is on, disable Save until edits exist. */
  isDirty?: boolean;
};

export function WizardFooter({
  isFirst,
  isLast,
  isSaving,
  onBack,
  onNext,
  onSubmit,
  submitLabel = "Submit",
  sticky = true,
  alwaysShowSubmit = false,
  isDirty = true,
}: Props) {
  const submitButton = (
    <button
      type="button"
      onClick={onSubmit}
      disabled={isSaving || (alwaysShowSubmit && !isDirty)}
      className="ti-btn bg-green-600 text-white !py-2 !px-4 !rounded-md disabled:opacity-60"
    >
      {isSaving ? "Saving…" : submitLabel}
    </button>
  );

  return (
    <div
      className={[
        "p-3 flex items-center justify-between gap-3 border-t border-dashed border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg",
        sticky ? "sticky bottom-0 z-10" : "",
      ].join(" ")}
    >
      <div className="flex">
        {!isFirst && (
          <button
            type="button"
            onClick={onBack}
            className="ti-btn ti-btn-secondary"
            disabled={isSaving}
          >
            Back
          </button>
        )}
      </div>

      <div className="flex ml-auto items-center gap-2">
        {isLast ? (
          submitButton
        ) : (
          <>
            {alwaysShowSubmit && submitButton}
            <button
              type="button"
              onClick={onNext}
              className="ti-btn ti-btn-primary-full text-white"
              disabled={isSaving}
            >
              Next
            </button>
          </>
        )}
      </div>
    </div>
  );
}
