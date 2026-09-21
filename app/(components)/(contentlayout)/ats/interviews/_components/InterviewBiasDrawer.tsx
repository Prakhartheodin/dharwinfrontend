"use client";

import { useEffect } from "react";
import InterviewBiasPanel from "./InterviewBiasPanel";

export type InterviewBiasDrawerProps = {
  open: boolean;
  meetingId: string;
  title?: string;
  canRerun: boolean;
  onClose: () => void;
};

/**
 * Right-hand drawer with the full staff bias review for one interview.
 */
export default function InterviewBiasDrawer({
  open,
  meetingId,
  title,
  canRerun,
  onClose,
}: InterviewBiasDrawerProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[110] bg-black/35 backdrop-blur-[3px] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`fixed inset-y-0 right-0 z-[111] flex w-full max-w-md flex-col bg-white shadow-[-32px_0_80px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] dark:bg-[#141621] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="interview-bias-drawer-title"
        hidden={!open}
      >
        {open && meetingId ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-defaultborder dark:border-white/10 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="interview-bias-drawer-title"
                  className="text-base font-semibold text-defaulttextcolor dark:text-white mb-0"
                >
                  Bias review
                </h2>
                {title ? (
                  <p className="text-xs text-defaulttextcolor/60 dark:text-white/60 mt-1 truncate" title={title}>
                    {title}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light shrink-0"
                onClick={onClose}
                aria-label="Close bias review"
              >
                <i className="ri-close-line text-lg" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <InterviewBiasPanel
                meetingId={meetingId}
                canRerun={canRerun}
                embedded
                hideWhenForbidden={false}
              />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
